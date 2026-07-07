# Outbox Pattern — Bilkul Simple Samjho
## Real AWS Implementation — PostgreSQL + DynamoDB

---

## पहले PROBLEM समझो — बिना Outbox के क्या होता है

मान लो तुम्हारा order system है।  
जब order आता है तो **दो काम** करने पड़ते हैं:

```
1. PostgreSQL में order save करो  (main database)
2. DynamoDB में bhi save करो     (cache / fast read के लिए)
```

तुम normally ऐसा करते हो:

```javascript
// ❌ GALAT TARIKA — Dual Write Problem

exports.handler = async (event) => {
  // Step 1
  await postgres.query('INSERT INTO orders ...');   // ✅ ho gaya

  // Step 2  
  await dynamoDB.putItem({ ... });                  // ❌ CRASH ho gaya!

  // अब क्या हुआ?
  // PostgreSQL में data HAI
  // DynamoDB में data NAHI
  // → INCONSISTENCY!
}
```

### 3 तरह से crash हो सकता है:

```
CASE 1: DynamoDB network fail
  PostgreSQL ✅  →  DynamoDB ❌  →  INCONSISTENCY

CASE 2: Lambda timeout (29 sec limit)
  PostgreSQL ✅  →  DynamoDB call ही नहीं हुआ  →  INCONSISTENCY

CASE 3: Lambda crash / OOM
  PostgreSQL ✅  →  DynamoDB अधूरा  →  INCONSISTENCY
```

---

## SOLUTION — Outbox Pattern क्या करता है

**Simple Idea:**
> DynamoDB को directly मत बुलाओ।  
> PostgreSQL में ही एक extra table बनाओ जिसमें "करने वाले काम" लिखो।  
> एक अलग worker बाद में वो काम करेगा।

```
OUTBOX = वो डिब्बा जिसमें "भेजने वाली चिट्ठियाँ" रखते हैं
         जब postman आएगा तब deliver करेगा
```

---

## COMPLETE FLOW — Step by Step

```
┌──────────────────────────────────────────────────────────────┐
│  STEP 1 — User Form Submit करता है                          │
│                                                              │
│  Browser                                                     │
│    ↓                                                         │
│  API Gateway                                                 │
│  https://ixthoe12fe.execute-api.ap-south-1.amazonaws.com    │
│    ↓                                                         │
│  Lambda: lambda-outbox-processor                            │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 2 — PostgreSQL में SINGLE TRANSACTION                  │
│                                                              │
│  BEGIN;   ← transaction शुरू                                │
│                                                              │
│  INSERT INTO orders          ← business data                │
│  (ORD-6096, CUST-123, ...)                                  │
│                                                              │
│  INSERT INTO outbox_events   ← "काम करना है" note करो      │
│  (ORDER_CREATED, PENDING, payload)                          │
│                                                              │
│  COMMIT;  ← दोनों एक साथ save हुए                          │
│                                                              │
│  अगर कुछ भी fail हो → ROLLBACK → दोनों cancel              │
│  "या दोनों होगा, या कोई नहीं"                               │
└──────────────────────────────────────────────────────────────┘
                          ↓
              (EventBridge हर 1 minute बाद)
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 3 — Worker Lambda PENDING events process करता है      │
│                                                              │
│  Lambda: lambda-outbox-worker                               │
│                                                              │
│  1. PostgreSQL से PENDING events लो                         │
│     SELECT * FROM outbox_events WHERE status='PENDING'      │
│                                                              │
│  2. DynamoDB में डालो                                        │
│     PutItem { PK: ORDER#ORD-6096, SK: CUSTOMER#CUST-123 }  │
│                                                              │
│  3. SUCCESS? → DONE mark करो                                │
│     UPDATE outbox_events SET status='DONE'                  │
│                                                              │
│  4. FAIL? → retry_count++ → PENDING रहेगा → next minute    │
│     (max 5 retries, फिर DEAD)                               │
└──────────────────────────────────────────────────────────────┘
```

---

## ACTUAL CODE — Lambda Processor

```javascript
// lambda-outbox/src/functions/outbox.js
// POST /outbox/orders  →  यह function चलता है

async function createOrder(body) {
  const { orderId, customerId, productId, quantity, amount } = JSON.parse(body);

  const client = await pool.connect();  // PostgreSQL connection

  try {
    // ── ATOMIC TRANSACTION START ──
    await client.query('BEGIN');

    // Business data डालो
    await client.query(
      `INSERT INTO orders (order_id, customer_id, product_id, quantity, amount)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, customerId, productId, quantity, amount]
    );

    // Outbox event डालो (SAME transaction में!)
    const payload = {
      PK: `ORDER#${orderId}`,
      SK: `CUSTOMER#${customerId}`,
      orderId, customerId, productId, quantity, amount,
      status: 'CREATED',
      createdAt: new Date().toISOString(),
    };

    await client.query(
      `INSERT INTO outbox_events (event_type, aggregate_id, payload)
       VALUES ($1, $2, $3)`,
      ['ORDER_CREATED', orderId, JSON.stringify(payload)]
    );

    await client.query('COMMIT');
    // ── ATOMIC TRANSACTION END ──
    // अगर यहाँ तक आए → दोनों INSERT हो गए ✅
    // अगर बीच में error → ROLLBACK → दोनों cancel ✅

    return { success: true, orderId, status: 'PENDING' };

  } catch (error) {
    await client.query('ROLLBACK');  // कुछ नहीं हुआ, safe है
    throw error;
  }
}
```

---

## ACTUAL CODE — Worker Lambda

```javascript
// lambda-outbox/src/functions/outbox-worker.js
// EventBridge हर 1 minute trigger करता है

exports.handler = async () => {
  const client = await pool.connect();

  // 1. PENDING events लो (FOR UPDATE SKIP LOCKED = deadlock नहीं)
  const { rows } = await client.query(`
    SELECT * FROM outbox_events
    WHERE status = 'PENDING' AND retry_count < 5
    ORDER BY created_at ASC
    LIMIT 20
    FOR UPDATE SKIP LOCKED
  `);

  for (const event of rows) {
    try {
      // 2. DynamoDB में डालो
      await dynamoDB.send(new PutItemCommand({
        TableName: 'outbox-orders-cache',
        Item: marshall({
          ...event.payload,
          syncedAt: new Date().toISOString(),
        }),
      }));
      // PutItem = IDEMPOTENT (same key दोबारा लिखो तो भी safe है)

      // 3. SUCCESS → DONE
      await client.query(
        `UPDATE outbox_events SET status='DONE', processed_at=NOW() WHERE id=$1`,
        [event.id]
      );

    } catch (dynamoError) {
      // 4. FAIL → retry
      await client.query(
        `UPDATE outbox_events SET retry_count=retry_count+1 WHERE id=$1`,
        [event.id]
      );
      // PENDING रहेगा → अगले minute retry होगा
    }
  }
};
```

---

## DATABASE TABLES

### Table 1: orders (business data)
```sql
CREATE TABLE orders (
  order_id    TEXT PRIMARY KEY,      -- ORD-6096
  customer_id TEXT NOT NULL,         -- CUST-123
  product_id  TEXT NOT NULL,         -- PROD-001
  quantity    INT  NOT NULL,         -- 2
  amount      NUMERIC(10,2),         -- 999.00
  status      TEXT DEFAULT 'CREATED',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Table 2: outbox_events (pending काम)
```sql
CREATE TABLE outbox_events (
  id            SERIAL PRIMARY KEY,
  event_id      UUID DEFAULT gen_random_uuid(),  -- unique ID
  event_type    TEXT,         -- ORDER_CREATED / ORDER_UPDATED
  aggregate_id  TEXT,         -- order_id जिसके लिए है
  payload       JSONB,        -- DynamoDB में जो डालना है
  status        TEXT DEFAULT 'PENDING',   -- PENDING→DONE / DEAD
  retry_count   INT DEFAULT 0,            -- 0 से 5 तक
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  processed_at  TIMESTAMPTZ               -- जब DONE हुआ
);
```

### Table 3: DynamoDB outbox-orders-cache
```
PK:  ORDER#ORD-6096       (partition key)
SK:  CUSTOMER#CUST-123    (sort key)
+ बाकी सारा data
syncedAt: कब sync हुआ
```

---

## AWS RESOURCES जो बने हैं

```
CloudFormation Stack: lambda-outbox-stack
├── DynamoDB Table         outbox-orders-cache
├── Lambda Function        lambda-outbox-processor   (HTTP routes)
├── Lambda Function        lambda-outbox-worker      (EventBridge)
├── EventBridge Rule       outbox-worker-every-1min  (हर 1 min)
├── IAM Role               lambda-outbox-role
├── Security Group         lambda-outbox-sg
├── VPC Endpoint           DynamoDB Gateway (FREE)   ← VPC से DynamoDB reach
└── API Gateway Routes     /outbox/* (existing API में add)
```

---

## REAL TEST PROOF — ORD-6096

```
Time 15:01:33  →  POST /outbox/orders
                   └── PostgreSQL COMMIT ✅
                   └── outbox_events id=3, status=PENDING ✅

Time 15:02:16  →  EventBridge Worker run हुआ (43 seconds बाद)
                   └── DynamoDB PutItem ✅
                   └── outbox_events id=3, status=DONE ✅

RESULT:
  PostgreSQL orders:  ORD-6096 ✅
  PostgreSQL events:  id=3, DONE, processed_at=15:02:16 ✅
  DynamoDB:           PK=ORDER#ORD-6096 ✅
  Consistency:        100% ✅
```

---

## FAILURE SCENARIOS — हर case में safe है

```
CASE 1: Lambda crash after COMMIT
  → orders table में data है ✅
  → outbox_events PENDING है ✅
  → अगले minute worker retry करेगा ✅

CASE 2: DynamoDB network timeout
  → retry_count++ → PENDING रहेगा ✅
  → max 5 retries, फिर DEAD (alert लगाओ) ✅

CASE 3: Worker crash mid-run
  → FOR UPDATE SKIP LOCKED ✅
  → दूसरा worker instance उठाएगा ✅

CASE 4: Same event दोबारा process हो
  → DynamoDB PutItem = idempotent ✅
  → Same PK/SK दोबारा safe है ✅
```

---

## API ENDPOINTS (Live हैं)

```
POST https://ixthoe12fe.execute-api.ap-south-1.amazonaws.com/prod/outbox/orders
  Body: { orderId, customerId, productId, quantity, amount }
  → Order create करो + outbox event PENDING

GET  .../outbox/orders
  → PostgreSQL orders table देखो

GET  .../outbox/events
  → outbox_events table (PENDING/DONE/DEAD)

POST .../outbox/process
  → Manually worker trigger करो (test के लिए)

GET  .../outbox/dynamodb
  → DynamoDB table देखो
```

---

## WEB APP

```
URL: https://firstbyrajesh.duckdns.org/postgresql

3 Tabs:
  1. Create Order  → Form fill करो → ATOMIC transaction
  2. Monitor Tables → outbox_events + DynamoDB live देखो
  3. Why Outbox?  → Problem/Solution explain करता है
```

---

## DEPLOY करना हो तो

```powershell
# Step 1: RDS start करो
aws rds start-db-instance --db-instance-identifier postgres-production --region ap-south-1

# Step 2: Deploy
cd D:\lambda-project\lambda-aws-project\lambda-outbox
.\deploy-outbox.ps1 -DBPass "SecurePass2024#Prod"

# Step 3: Test
curl -X POST https://ixthoe12fe.execute-api.ap-south-1.amazonaws.com/prod/outbox/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORD-001","customerId":"CUST-1","productId":"PROD-1","quantity":1,"amount":500}'
```

---

## Interview में यह बोलो

**Q: दो databases को consistent कैसे रखोगे?**

**A:**
> Outbox Pattern use करूँगा।
>
> एक PostgreSQL TRANSACTION में दोनों operations करूँगा —
> business table में INSERT + outbox_events table में PENDING event INSERT।
> यह atomic है — या दोनों होगा, या कोई नहीं।
>
> फिर एक separate worker (EventBridge every 1 min) PENDING events पढ़ेगा,
> DynamoDB sync करेगा, और DONE mark करेगा।
> Fail हो तो retry होगा — data loss impossible है।
>
> Key guarantee: PostgreSQL transaction = atomic।
> DynamoDB sync = eventual consistency with retry।
