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

## outbox_events अलग table क्यों — orders से directly क्यों नहीं पढ़ते?

यह सवाल interview में आता है। समझो:

### Problem 1 — दो अलग "status" का मतलब अलग होता है

```sql
-- orders.status = BUSINESS status
--   CREATED → order आया
--   CONFIRMED → payment हो गया
--   SHIPPED → भेज दिया

-- अगर यहाँ DynamoDB sync का status भी मिलाओ:
SELECT * FROM orders WHERE status = 'PENDING'
-- ❌ PENDING का मतलब क्या?
--    order pending है? या DynamoDB sync pending है?
--    एक column में दोनों नहीं मिला सकते!
```

### Problem 2 — एक order के कई events होते हैं

```
ORD-6096 के events:
  1. ORDER_CREATED    → DynamoDB sync करो
  2. ORDER_CONFIRMED  → DynamoDB update करो
  3. ORDER_SHIPPED    → DynamoDB update करो

orders table में सिर्फ 1 row है ORD-6096 की
outbox_events में 3 rows होंगी — तीनों track होंगी
```

### Problem 3 — retry_count कहाँ रखोगे?

```sql
-- orders table में यह columns add करने पड़ेंगे:
ALTER TABLE orders ADD COLUMN dynamo_sync_status TEXT;
ALTER TABLE orders ADD COLUMN dynamo_retry_count INT;
ALTER TABLE orders ADD COLUMN dynamo_processed_at TIMESTAMPTZ;

-- ❌ गंदा design है
-- Business table में infrastructure की जानकारी क्यों?
-- Customer के order data के साथ DynamoDB sync tracking?
```

### सही design — दोनों के readers अलग हैं

```
orders table    → Customer पढ़ता है  ("मेरा order कहाँ है?")
outbox_events   → Worker पढ़ता है   ("DynamoDB में भेजना बाकी है?")

Readers अलग → Tables अलग
```

```
एक line में:
orders  = WHAT happened   (business fact)
outbox  = WHAT to do next (pending work)
```

---

## आसान भाषा में समझो — यह सब करते क्यों हैं?

**मान लो तुम्हारी एक दुकान है।**

दुकान में एक **रजिस्टर** है — जिसमें हर sale लिखते हो।
यह PostgreSQL है।

अब तुम्हारे **1000 customers** एक साथ आए — सब order status जानना चाहते हैं।

```
Problem:
  सब customers एक ही रजिस्टर पर देखना चाहते हैं
  रजिस्टर एक बार में 100 लोगों को ही दिखा सकता है
  बाकी 900 → wait करते हैं → slow! timeout!
```

**Solution — हर counter पर एक चिट रखो:**

```
Customer आया → चिट देखो → instant answer!    ← DynamoDB
               (1 लाख customers एक साथ)

रात को worker चिट को रजिस्टर से update करे  ← Outbox Worker
```

```
रजिस्टर (PostgreSQL) = सही हिसाब रखना       ← WRITE यहाँ
चिट     (DynamoDB)   = जल्दी answer देना     ← READ यहाँ

दोनों का काम अलग है → दोनों अलग हैं
```

**Outbox Pattern का एक ही काम है:**
> रजिस्टर में जो लिखा, वो चिट में भी जरूर आएगा — चाहे कितनी भी देर लगे।

---

## PostgreSQL 1 लाख users handle क्यों नहीं कर सकता?

यह speed का issue नहीं है — **connection का issue है।**

### PostgreSQL कैसे काम करता है:

```
हर user connect करे → PostgreSQL एक नया PROCESS बनाता है
                       (OS level thread — heavy!)

User 1   → Process 1   (10MB RAM)
User 2   → Process 2   (10MB RAM)
User 100 → Process 100 (10MB RAM)
User 101 → ❌ WAIT — "sorry, connection limit full"

Default max_connections = 100
1GB RAM server पर max ~200-300 connections

1 लाख users = 1 लाख processes = 1TB RAM → impossible
```

### DynamoDB कैसे काम करता है:

```
DynamoDB = HTTP API है
           हर request = HTTP call → response → connection बंद

1 लाख users → 1 लाख HTTP requests
              DynamoDB के पास कोई "connection" नहीं होती
              AWS internally distribute करता है → सब fast
```

### Speed दोनों fast हैं — लेकिन use case अलग है:

```
PostgreSQL fast है जब:
  → 50-100 users एक साथ हों
  → Complex SQL queries हों (JOIN, GROUP BY)
  → ACID transaction चाहिए हो

DynamoDB fast है जब:
  → 1 लाख users एक साथ हों
  → Simple GET/PUT हो (PK से ढूंढो)
  → No connection limit चाहिए हो
```

> PostgreSQL slow नहीं है — उसकी **connection limit** है।
> DynamoDB की कोई connection limit नहीं — इसीलिए massive scale के लिए use करते हैं।

---

## MongoDB में भी connection limit नहीं होती — तो DynamoDB क्यों?

MongoDB में connection limit **होती है** — PostgreSQL जैसी नहीं, लेकिन होती है।

### MongoDB भी connection-based है:

```
MongoDB → हर app server एक connection pool बनाता है
          default pool size = 100 connections per server

10 servers × 100 connections = 1000 connections MongoDB पर
यह manageable है — लेकिन limit है
```

### MongoDB vs DynamoDB — असली फर्क:

```
MongoDB (self-hosted / Atlas):
  → Connection pool manage करना पड़ता है
  → Scale करने पर config बदलनी पड़ती है
  → Sharding setup करना पड़ता है
  → तुम्हारी जिम्मेदारी है

DynamoDB (AWS Managed):
  → कोई connection नहीं — HTTP API है
  → Scale automatically होता है
  → AWS की जिम्मेदारी है
  → Serverless — Lambda के साथ perfect fit
```

### Lambda + DynamoDB = Perfect Match

```
Lambda = हर request पर नया instance बनती है (stateless)

PostgreSQL से connect करो:
  → TCP connection बनाओ  (100ms overhead)
  → query करो
  → connection बंद करो
  → अगली request पर फिर नया connection!  ❌ slow

DynamoDB से connect करो:
  → HTTP call करो → response आया ✅
  → कोई connection overhead नहीं
```

```
PostgreSQL  → Relational, ACID, connection-based
MongoDB     → Document DB, flexible schema, connection-based
DynamoDB    → Key-Value, HTTP-based, AWS managed, serverless

Lambda + DynamoDB = दोनों stateless, दोनों HTTP = perfect
```

---

## orders का पूरा data outbox_events में क्यों डालते हैं?

Worker को DynamoDB में डालना है — उसे orders table JOIN नहीं करना चाहिए।

```
अगर payload में सिर्फ orderId डालें:
  Worker को orders table query करनी पड़ेगी
  → extra DB call → slow
  → orders delete हो गया तो? → FAIL ❌

अगर payload में पूरा data डालें:
  Worker सीधे payload उठाए → DynamoDB में डाले ✅
  → कोई JOIN नहीं → fast → orders delete हो तो भी safe ✅
```

```javascript
// DynamoDB में यही जाएगा — orders से query नहीं करनी
const payload = {
  PK: `ORDER#${orderId}`,
  SK: `CUSTOMER#${customerId}`,
  orderId, customerId, productId, quantity, amount  // ← सब यहाँ
};
```

### Snapshot — event के समय का data save रहता है

```
मान लो order का amount बाद में change हुआ:
  orders table  → नया amount (updated)
  outbox payload → पुराना amount (event के समय का) ← correct!

Event history accurate रहती है — बाद के changes affect नहीं करते
```

---

## Replica Set यही काम करता है — Reads के लिए?

हाँ — MongoDB Replica Set यही concept है — लेकिन differently:

```
MongoDB Replica Set:
  Primary   → WRITE यहाँ होता है
  Secondary → READ यहाँ होता है (Primary का copy)

यह भी CQRS जैसा है — Write अलग, Read अलग
```

### लेकिन Replica Set vs Outbox Pattern में फर्क:

```
Replica Set:
  ✅ Automatic sync — कुछ नहीं करना
  ✅ Same DB technology (MongoDB → MongoDB)
  ❌ पूरा data copy होता है — selective नहीं
  ❌ दूसरी technology में नहीं जा सकता (MongoDB → DynamoDB ❌)
  ❌ Data transformation नहीं होती

Outbox Pattern:
  ✅ Selective — सिर्फ वो events जो चाहिए
  ✅ Any technology में भेज सकते हो (PostgreSQL → DynamoDB ✅)
  ✅ Payload transform करके भेजो — DynamoDB के format में
  ✅ Retry, dead-letter, custom logic
  ❌ Extra code लिखना पड़ता है
```

### कब क्या use करें:

```
Replica Set  → Same DB technology, सब data चाहिए, simple setup
Outbox       → Different technologies, selective sync, custom transform
```

> Replica Set = सब copy करो (automatic)
> Outbox = चुन के भेजो (controlled)

---

## Replication क्यों नहीं use करते — Outbox क्यों?

Replication भी dual-write problem solve करता है — लेकिन:

```
Replication = PostgreSQL का हर change automatically copy होता है
              tables, indexes, सब कुछ — तुम्हारा control नहीं

Outbox      = सिर्फ वो data जो तुम चाहते हो
              तुम्हारा control — क्या भेजना है, कैसे भेजना है
```

### Replication की problems:

```
❌ पूरा DB copy होता है — DynamoDB में orders + users + logs सब?
❌ Extra infra चाहिए — Debezium, Kafka, connector setup
❌ Schema change होने पर replication टूट जाती है
❌ DynamoDB का format अलग है — transformation कौन करेगा?
```

### Outbox की advantages:

```
✅ सिर्फ वो events भेजो जो चाहिए
✅ payload तुम बनाते हो — DynamoDB के format में
✅ कोई extra infra नहीं — सिर्फ Lambda + EventBridge
✅ Application level control — retry, dead-letter, custom logic
```

---

## DynamoDB में रखना ही क्यों है — PostgreSQL अकेला काफी नहीं?

यह सबसे important सवाल है।

### Problem — PostgreSQL की connection limit है

```
1 लाख users एक साथ product page देख रहे हैं:

  PostgreSQL = connection pool = max 100 connections
               101वां user → waiting / timeout / error

  DynamoDB   = कोई connection limit नहीं
               10 लाख requests/second handle करता है
               single-digit millisecond response
```

### Real use case — WRITE vs READ अलग करो

```
WRITE (order place करना) → PostgreSQL
  → ACID transaction चाहिए
  → consistency जरूरी है
  → दिन में एक बार होता है

READ (product देखना, order status check) → DynamoDB
  → लाखों बार होता है
  → fast response चाहिए
  → complex SQL query नहीं चाहिए
```

### यह pattern का नाम है — CQRS

```
Command (write) → PostgreSQL   (सही data, ACID, relational)
Query   (read)  → DynamoDB    (fast read, unlimited scale)

Outbox Pattern = दोनों को sync रखता है
```

```
Without Outbox:
  PostgreSQL write ✅ → DynamoDB write ❌ → INCONSISTENCY

With Outbox:
  PostgreSQL ATOMIC (orders + outbox_events) ✅
  Worker retry करता रहेगा जब तक DynamoDB sync न हो ✅
```

---

## Lambda Console में Processor का Trigger क्यों नहीं दिखता?

Worker में EventBridge trigger दिखता है — Processor में API Gateway नहीं दिखता।

**Reason — SourceArn missing था:**

```yaml
# Worker Permission ✅ — SourceArn है → trigger दिखता है
OutboxWorkerEventBridgePermission:
  Type: AWS::Lambda::Permission
  Properties:
    Principal: events.amazonaws.com
    SourceArn: !GetAtt OutboxWorkerScheduleRule.Arn  ← exact ARN

# Processor Permission ❌ — SourceArn नहीं था → trigger नहीं दिखता
OutboxProcessorPermission:
  Type: AWS::Lambda::Permission
  Properties:
    Principal: apigateway.amazonaws.com
    SourceAccount: !Ref AccountId   ← सिर्फ account, कौन सी API Gateway?
```

**Fix — SourceArn add किया:**

```yaml
OutboxProcessorPermission:
  Type: AWS::Lambda::Permission
  Properties:
    Principal: apigateway.amazonaws.com
    SourceAccount: !Ref AccountId
    SourceArn: !Sub "arn:aws:execute-api:ap-south-1:${AccountId}:${ExistingApiId}/*"
    #                                                                ↑ ixthoe12fe
```

**SourceArn होने पर Console जानता है — कौन सी API Gateway → trigger दिखाता है।**

---

## API Gateway Lambda को Trigger कैसे करती है?

Browser जब POST करता है तो यह flow होता है:

```
Browser
  ↓
POST https://ixthoe12fe.execute-api.ap-south-1.amazonaws.com/prod/outbox/orders
  ↓
API Gateway (ixthoe12fe)
  ↓  ← यहाँ trigger होता है
Lambda: lambda-outbox-processor
  ↓
PostgreSQL → Response
```

### CloudFormation में Trigger कैसे बना है:

```yaml
# Step 1: Integration — API Gateway को Lambda से जोड़ो
OutboxOrdersPostIntegration:
  Type: AWS::ApiGatewayV2::Integration
  Properties:
    ApiId: ixthoe12fe
    IntegrationType: AWS_PROXY          ← पूरी request forward करो
    IntegrationUri: !GetAtt LambdaFunction.Arn  ← इस Lambda को

# Step 2: Route — कौन सा URL किस Integration को जाए
OutboxOrdersPostRoute:
  Type: AWS::ApiGatewayV2::Route
  Properties:
    ApiId: ixthoe12fe
    RouteKey: "POST /outbox/orders"    ← यह URL match हो
    Target: !Sub "integrations/${OutboxOrdersPostIntegration}"
```

### AWS के अंदर क्या होता है:

```
1. Browser POST करता है
   ↓
2. API Gateway request receive करती है
   ↓
3. Route match: POST /outbox/orders → integration देखो
   ↓
4. Lambda invoke होती है
   ↓
5. Lambda handler चलता है → PostgreSQL → response बनाओ
   ↓
6. API Gateway response browser को देती है
```

### AWS_PROXY का मतलब:

```
API Gateway कुछ नहीं बदलती — सिर्फ forward करती है

Lambda को मिलता है:
  → Request headers
  → Request body
  → Path parameters
  → Query strings

Lambda का response सीधे browser को जाता है
```

---

## EventBridge क्यों choose किया — alternatives से बेहतर क्यों?

हमें चाहिए था: हर 1 minute में worker Lambda चले।

### Alternatives compare करो:

```
Option 1: EC2 पर Cron job
  → EC2 हमेशा running रखो = cost
  → EC2 down हो तो worker नहीं चलेगा
  → manage करना पड़ेगा ❌

Option 2: SQS
  → हर order create पर SQS में message डालो
  → Lambda trigger हो
  → message lost हो गया तो? ❌
  → Extra code + extra service ❌

Option 3: EventBridge ✅
  → Serverless — कोई server नहीं
  → rate(1 minute) — simple config
  → AWS manage करता है — down नहीं होगा
  → CloudFormation में बस यह:
```

```yaml
OutboxWorkerScheduleRule:
  Type: AWS::Events::Rule
  Properties:
    ScheduleExpression: rate(1 minute)   ← बस यही काफी है
    State: ENABLED
    Targets:
      - Id: OutboxWorkerTarget
        Arn: !GetAtt OutboxWorkerFunction.Arn
```

### EventBridge perfect है क्योंकि:

```
Outbox Worker को चाहिए:    EventBridge देता है:
  Regular interval (1 min)  → rate(1 minute) ✅
  Reliable                  → AWS managed, miss नहीं करता ✅
  Serverless                → कोई EC2 नहीं ✅
  Simple setup              → YAML में 10 lines ✅
  Cost                      → ~$0.002/month (लगभग free) ✅
```

> EventBridge = AWS का Cron job — serverless, reliable, free जैसा।

---

## दूसरी Services Time-Based Scheduling क्यों नहीं कर सकतीं?

```
SQS:
  → Message queue है
  → कोई message डाले तब trigger होता है
  → खुद से "हर 1 minute" नहीं चला सकता ❌

SNS:
  → Notification service है
  → कोई publish करे तब fire होता है
  → Self-scheduling नहीं ❌

Step Functions:
  → Workflow है
  → Wait state दे सकता है — लेकिन खुद start कौन करेगा?
  → Recurring schedule के लिए EventBridge चाहिए ही ❌

Lambda:
  → खुद को trigger नहीं कर सकती
  → कोई बाहर से बुलाए तब चलती है ❌
```

### सिर्फ यह services time-based trigger कर सकती हैं:

```
EventBridge Scheduler  ✅  → rate() / cron() — हमने यही use किया
CloudWatch Events      ✅  → EventBridge का पुराना नाम — same चीज
AWS Batch Scheduler    ✅  → Heavy — containers के लिए
EC2 Cron               ✅  → Server चाहिए — serverless नहीं
```

### Reactive vs Proactive:

```
SQS / SNS / Lambda = Reactive
  → कोई बुलाए तब चलते हैं
  → खुद से कुछ नहीं करते

EventBridge = Proactive
  → खुद समय देखता है
  → समय आने पर Lambda को जगाता है
```

> Time देखकर खुद trigger होना = Scheduler का काम।
> EventBridge AWS का एकमात्र serverless Scheduler है।

---

## Outbox Pattern में दो Lambda क्यों — एक में क्यों नहीं?

दोनों Lambda का trigger अलग है:

```
lambda-outbox-processor  ← API Gateway trigger करती है
                            "User ने POST किया तब चलो"
                            Request आए → Response दो → बंद

lambda-outbox-worker     ← EventBridge trigger करता है
                            "हर 1 minute चलो"
                            User का कोई काम नहीं — background job
```

### एक Lambda में करें तो क्या होगा:

```
Problem 1 — Timeout
  API Gateway Lambda = max 29 seconds timeout
  Worker को 60 seconds चाहिए (20 events process करे)
  एक में → worker का काम timeout हो जाएगा ❌

Problem 2 — Mixed responsibility
  User request आई → Lambda चली
  उसी Lambda को हर 1 minute भी चलाओ?
  EventBridge किसे trigger करे? सब routes चलेंगे ❌

Problem 3 — Scaling अलग है
  Processor → 1000 users एक साथ → 1000 Lambda instances
  Worker    → हर 1 minute → सिर्फ 1 instance काफी है
  एक में   → Worker भी 1000 बार चलेगा → redundant ❌
```

```
Processor = On-demand  (user बुलाए तब)
Worker    = Scheduled  (AWS हर minute बुलाए)

दो अलग jobs → दो अलग Lambda
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
