# Private EC2 par Express API — Bastion se Access

## Architecture

```
Internet
  ❌ http://10.0.3.122:3000  → BLOCKED (no public IP)

Bastion (13.201.118.213)
  ✅ curl http://10.0.3.122:3000  → WORKS
     (same VPC + SG allows :3000 from Bastion SG)
```

---

## Step 1 — Private EC2 mein jaao

```bash
# Local machine se
ssh private-ec2
# → [ec2-user@ip-10-0-3-122 ~]$
```

---

## Step 2 — Node.js Install karo

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify
node -v
npm -v
```

---

## Step 3 — Express API banao

```bash
mkdir ~/api && cd ~/api
npm init -y
npm install express

cat > server.js << 'EOF'
const express = require('express');
const app = express();
app.use(express.json());

const orders = [
  { id: 1, item: 'Laptop', price: 75000 },
  { id: 2, item: 'Phone',  price: 25000 },
];

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'Private EC2 - 10.0.3.122' });
});

app.get('/orders', (req, res) => {
  res.json({ orders, servedFrom: 'Private Subnet 10.0.3.0/24' });
});

app.get('/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === +req.params.id);
  order ? res.json(order) : res.status(404).json({ error: 'Not found' });
});

app.listen(3000, () => console.log('API running on :3000'));
EOF

node server.js &
```

---

## Step 4 — Bastion se Test karo (naya terminal)

```bash
# Local machine se Bastion pe jaao
ssh bastion
# → [ec2-user@ip-10-0-1-221 ~]$

# Bastion se Private EC2 API call karo
curl http://10.0.3.122:3000/health

curl http://10.0.3.122:3000/orders

curl http://10.0.3.122:3000/orders/1
```

---

## Expected Responses

```json
// GET /health
{
  "status": "ok",
  "server": "Private EC2 - 10.0.3.122"
}

// GET /orders
{
  "orders": [
    { "id": 1, "item": "Laptop", "price": 75000 },
    { "id": 2, "item": "Phone",  "price": 25000 }
  ],
  "servedFrom": "Private Subnet 10.0.3.0/24"
}

// GET /orders/1
{
  "id": 1,
  "item": "Laptop",
  "price": 75000
}
```

---

## Security Group — Kyun Kaam Karta Hai

```
demo-private-ec2-sg (sg-00e0a49a2643c92dc)

INBOUND Rules:
TCP :22    from demo-bastion-sg → ALLOW  (SSH)
TCP :3000  from demo-bastion-sg → ALLOW  (Express API)

Matlab:
✅ Bastion → curl http://10.0.3.122:3000  (allowed)
❌ Internet → http://10.0.3.122:3000      (blocked, no public IP)
❌ Koi aur EC2 → http://10.0.3.122:3000  (blocked, SG sirf Bastion allow karta hai)
```

---

## Complete Flow

```
Tumhara Laptop
    │
    │ ssh bastion
    ▼
Bastion EC2 (13.201.118.213)
    │
    │ curl http://10.0.3.122:3000/orders
    │ (private VPC network se request)
    ▼
Private EC2 (10.0.3.122)
    │
    │ Express server port 3000 par sun raha hai
    │ SG check: "Bastion SG se aa raha hai? ✅ ALLOW"
    ▼
Response wapas Bastion ko
    │
    ▼
Bastion terminal mein JSON dikha

Internet se koi seedha access nahi kar sakta ✅
```

---

## Real IPs

| Machine | IP | Role |
|---|---|---|
| Tumhara Laptop | 160.202.37.90 (local ISP) | Client |
| Bastion EC2 | 13.201.118.213 (public) | Jump host |
| Private EC2 | 10.0.3.122 (private only) | Express API server |
| NAT Gateway | 3.109.42.198 (EIP) | Outbound internet |
