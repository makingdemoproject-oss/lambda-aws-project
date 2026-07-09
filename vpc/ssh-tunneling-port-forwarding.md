# SSH Tunneling — Port Forwarding Complete Guide

## SSH ke 3 Alag Access Methods

```
Method 1: Normal SSH       → Remote shell milti hai
Method 2: SSH -A           → Agent Forwarding (key forward hoti hai)
Method 3: SSH -N Tunneling → Koi shell nahi, sirf tunnel/port forward
```

---

## Method 1 — Normal SSH (Remote Shell)

```bash
ssh -i rajesh-key-pair.pem ec2-user@13.201.118.213

# Result:
[ec2-user@ip-10-0-1-221 ~]$   ← Remote shell milti hai
# Tum EC2 ke andar ho
```

---

## Method 2 — SSH -A (Agent Forwarding)

```bash
ssh -A -i rajesh-key-pair.pem ec2-user@13.201.118.213
```

```
-A flag kya karta hai:

Tumhara Laptop
(rajesh-key-pair agent mein hai)
    │
    │ ssh -A (key forward karo)
    ▼
Bastion EC2
(ab Bastion ke paas tumhari key hai)
    │
    │ ssh ec2-user@10.0.3.122
    │ (key use kar sakta hai)
    ▼
Private EC2 ✅

Bina -A ke:
Bastion ke paas key nahi hogi
→ Permission denied ❌
```

**Use case:** Bastion se Private EC2 mein jump karna (bina key copy kiye)

---

## Method 3 — SSH -N (No Shell, Sirf Tunnel)

```bash
ssh -N -L 3306:localhost:3306 ec2-user@13.201.118.213
```

```
-N flag kya karta hai:
→ Remote shell NAHI milegi [ec2-user@...]$
→ Sirf SSH connection banaye rakho (tunnel active)
→ Background mein kaam karta hai

-L flag (Local Port Forward):
→ Tumhara local port ko remote port se connect karo
```

**Result:**
```
Terminal hang jaata hai (koi output nahi)
Lekin tunnel chal rahi hoti hai background mein
```

---

## Port Forwarding — Kaise Kaam Karta Hai

### Formula

```
ssh -N -L [LOCAL_PORT]:[REMOTE_HOST]:[REMOTE_PORT] user@BASTION_IP

LOCAL_PORT  = Tumhare laptop ka port
REMOTE_HOST = EC2 ke nazariye se kahan jaana hai
REMOTE_PORT = Remote machine ka port
```

---

## Example 1 — MySQL/RDS Access (localhost se)

```bash
# Tunnel banao
ssh -N -L 3306:localhost:3306 ec2-user@13.201.118.213

# Ab doosre terminal mein
mysql -h 127.0.0.1 -P 3306 -u admin -p
# → EC2 ka MySQL khulega localhost se!
```

```
Tumhara Laptop                    EC2
localhost:3306 ──SSH tunnel──► 13.201.118.213:3306
(MySQL client)                    (MySQL server)

Tumhe laga: localhost se connect kar raha hoon
Reality: EC2 ka MySQL use ho raha hai
```

---

## Example 2 — Private EC2 Express API Access (localhost se)

```bash
# Tunnel banao — Private EC2 ka port 3000 → local 8080
ssh -N -L 8080:10.0.3.122:3000 ec2-user@13.201.118.213
#              └─────────────┘
#              Private EC2 IP:Port (Bastion ke nazariye se)

# Ab browser ya curl mein
curl http://localhost:8080/orders
# → Private EC2 ka Express API respond karega!
```

```
Tumhara Laptop          Bastion              Private EC2
localhost:8080 ──SSH──► 13.201.118.213 ────► 10.0.3.122:3000
(browser/curl)          (jump point)          (Express API)

Internet se 10.0.3.122 directly accessible nahi
Lekin tunnel se localhost:8080 → private EC2 ka API ✅
```

---

## Example 3 — RDS Private Database Access

```bash
# RDS private subnet mein hai, directly accessible nahi
# Bastion se tunnel banao

ssh -N -L 5432:postgres-production.cn2yekq0q1tg.ap-south-1.rds.amazonaws.com:5432 \
  ec2-user@13.201.118.213

# Ab doosre terminal mein pgAdmin ya psql se connect karo
psql -h localhost -p 5432 -U appuser -d orderdb
# → Private RDS khulega!
```

```
Tumhara Laptop               Bastion          RDS (Private)
localhost:5432 ──SSH tunnel──► Bastion ──────► RDS:5432
(pgAdmin/psql)                                 (private subnet)
```

---

## SSH -N ke Flags

```
-N  → No shell (sirf tunnel, koi [ec2-user@]$ nahi)
-L  → Local port forward (laptop ka port → remote)
-R  → Remote port forward (remote ka port → laptop)
-f  → Background mein run karo (terminal free rehti hai)
-v  → Verbose (debug ke liye)
```

### Background mein run karna

```bash
# -f flag lagao → terminal free ho jaati hai
ssh -f -N -L 8080:10.0.3.122:3000 ec2-user@13.201.118.213

# Tunnel chal rahi hai background mein
curl http://localhost:8080/orders  # kaam karega ✅

# Kill karna ho to
ps aux | grep ssh
kill <PID>
```

---

## Teeno Methods Comparison

```
┌─────────────────┬────────────────────────────────────────────┐
│ Command         │ Kya milta hai                              │
├─────────────────┼────────────────────────────────────────────┤
│ ssh             │ Remote shell [ec2-user@...]$               │
│                 │ EC2 ke andar commands chala sakte ho       │
├─────────────────┼────────────────────────────────────────────┤
│ ssh -A          │ Remote shell + Agent Forwarding            │
│                 │ Bastion se private EC2 jump kar sakte ho   │
├─────────────────┼────────────────────────────────────────────┤
│ ssh -N -L       │ Koi shell nahi                             │
│                 │ Sirf tunnel active                         │
│                 │ localhost se remote service access hoti hai│
└─────────────────┴────────────────────────────────────────────┘
```

---

## Hamare Project mein Real Use

```bash
# 1. Bastion ke through Private EC2 access
ssh private-ec2        ← ProxyJump (config mein set hai)

# 2. Private EC2 Express API localhost se access karo
ssh -N -L 8080:10.0.3.122:3000 ec2-user@13.201.118.213
curl http://localhost:8080/orders

# 3. Private RDS localhost se access karo
ssh -N -L 5432:postgres-production.cn2yekq0q1tg.ap-south-1.rds.amazonaws.com:5432 \
  ec2-user@13.201.118.213
psql -h localhost -p 5432 -U appuser -d orderdb
```

---

## Important Points

```
✅ ssh -N → Terminal mein koi output nahi aata
            Lagta hai command hang ho gaya
            Actually tunnel chal rahi hoti hai

✅ Tunnel active hone ke baad → naya terminal kholke
            localhost se access karo

✅ Ctrl+C dabaane se tunnel band ho jaati hai

✅ -f flag lagao → background mein jaata hai
            Terminal turant free ho jaati hai
```
