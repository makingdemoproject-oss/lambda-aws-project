# SSH Tunnel — Localhost se Private EC2 Access Kaise Hoti Hai

## Command

```bash
ssh -N -L 8080:10.0.3.122:3000 ec2-user@13.201.118.213
```

---

## Pipe Analogy

```
Tumhara Laptop
localhost:8080 ──────────────────────────► 10.0.3.122:3000
(tumhara port)    SSH Tunnel (encrypted)    (Private EC2 port)
```

---

## Andar se Kya Hota Hai

```
Step 1: SSH tunnel banti hai
────────────────────────────
Laptop ──encrypted connection──► Bastion (13.201.118.213)

Step 2: Bastion ek pipe banata hai
────────────────────────────────────
Bastion ──internal network──► Private EC2 (10.0.3.122:3000)

Step 3: Tumhara laptop ka port 8080
─────────────────────────────────────
OS register karta hai:
"port 8080 par jo bhi aaye
 → SSH tunnel mein daal do
 → Bastion forward karega
 → Private EC2:3000 pe pahunchega"
```

---

## Simple Analogy — Water Pipe

```
Ghar ka nala (localhost:8080)
    │
    │ === Pipe (SSH tunnel) ===
    │
Sheher ka water tank (Private EC2:3000)

Tum ghar mein tap kholte ho (curl localhost:8080)
Pani tank se aata hai (Private EC2 respond karta hai)
Tum seedha tank pe nahi gaye — pipe ne connect kiya
```

---

## Proof

```bash
# Terminal 1 — Tunnel banao
ssh -N -L 8080:10.0.3.122:3000 ec2-user@13.201.118.213
# (koi output nahi — tunnel active hai background mein)

# Terminal 2 — Localhost se access karo
curl http://localhost:8080/orders

# Response aayega Private EC2 se:
# { "orders": [...], "servedFrom": "Private Subnet 10.0.3.0/24" }
```

---

## Key Point

```
Tumhe lagta hai:           Reality:
localhost:8080             localhost:8080
pe connect                      │
kar raha hoon              SSH Tunnel
                                │
                           Bastion (13.201.118.213)
                           (beech mein hai, transparent)
                                │
                           Private EC2:3000
                           (actual server yahan hai)

OS ko pata hai:
"8080 = SSH tunnel ka dusra end"
```

---

## RDS bhi isi tarah access hoti hai

```bash
# Tunnel banao
ssh -N -L 5432:postgres-production.cn2yekq0q1tg.ap-south-1.rds.amazonaws.com:5432 \
  ec2-user@13.201.118.213

# Localhost se pgAdmin ya psql se connect karo
psql -h localhost -p 5432 -U appuser -d orderdb

# Tumhe laga: localhost mein database hai
# Reality: Private RDS ka data aa raha hai
```

---

## -L Flag Ka Formula

```
-L [LOCAL_PORT] : [REMOTE_HOST] : [REMOTE_PORT]
    │               │               │
    │               │               └── Remote machine ka port
    │               └────────────────── Bastion ke nazariye se kahan jaana hai
    └────────────────────────────────── Tumhare laptop ka port
```

### Examples

```bash
# Private EC2 Express API
-L 8080:10.0.3.122:3000
# localhost:8080 → Private EC2:3000

# Private RDS
-L 5432:rds-endpoint:5432
# localhost:5432 → RDS:5432

# Private EC2 MySQL
-L 3306:10.0.3.122:3306
# localhost:3306 → Private EC2:3306
```

---

## Summary

```
Bina Tunnel:
Internet → Private EC2:3000 ❌ (no public IP, blocked)

Tunnel ke saath:
localhost:8080 → SSH Tunnel → Bastion → Private EC2:3000 ✅
(private EC2 ka koi public IP nahi
 phir bhi localhost se access ho gayi!)
```
