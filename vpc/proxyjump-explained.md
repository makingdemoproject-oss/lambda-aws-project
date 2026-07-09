# SSH ProxyJump — Kaise Kaam Karta Hai

## Simple Explanation

```
JUMP = Ek jagah se doosri jagah hop karna

Laptop ──────jump──────► Bastion ──────jump──────► Private EC2
         (rajesh-key)              (demo-private-key)
```

---

## Real Life Analogy

```
Ghar (Laptop)
    │
    │ "Main restricted area mein jaana chahta hoon"
    ▼
Security Gate (Bastion)
    │ ✅ ID check hua (rajesh-key-pair)
    │ "Andar jaao"
    ▼
Restricted Room (Private EC2)
    │ ✅ Room key check hua (demo-private-key-pair)
    │ "Enter"
    ▼
[ec2-user@ip-10-0-3-122 ~]$
```

---

## SSH mein ProxyJump ka Flow

```
ssh private-ec2
    │
    ├─ Jump 1: Bastion se connect (13.201.118.213)
    │          rajesh-key-pair.pem ✅
    │
    └─ Jump 2: Bastion ke through Private EC2 (10.0.3.122)
               demo-private-key-pair.pem ✅
               [ec2-user@ip-10-0-3-122 ~]$ ✅
```

---

## Andar se Kya Hota Hai

```
ssh private-ec2 command diya
         │
         ▼
SSH client ne config padha:
"private-ec2 ke liye ProxyJump = bastion"
         │
         ▼
Step 1: Bastion se TCP connection banao
─────────────────────────────────────────
Laptop ──SSH tunnel──► Bastion 13.201.118.213:22
(rajesh-key-pair se login)
         │
         ▼
Step 2: Bastion ke andar se Private EC2 ko connect karo
────────────────────────────────────────────────────────
Bastion ──TCP forward──► 10.0.3.122:22
(demo-private-key-pair se login)
         │
         ▼
Step 3: Laptop ko tunnel milti hai
────────────────────────────────────
Laptop ◄──── tunnel ────► Private EC2
       (bastion beech mein hai
        lekin transparent hai)
```

---

## Bina ProxyJump ke (Manual Steps)

```bash
# Step 1: Manually bastion pe jaao
ssh -i rajesh-key-pair.pem ec2-user@13.201.118.213

# Step 2: Bastion ke andar se private EC2 pe jaao
ssh -i demo-private-key-pair.pem ec2-user@10.0.3.122
```

## ProxyJump ke saath (Automatic)

```bash
# Ek hi command — SSH khud dono steps karta hai
ssh private-ec2
```

---

## ~/.ssh/config

```
Host bastion
    HostName 13.201.118.213
    User ec2-user
    IdentityFile C:\Users\HP\.ssh\rajesh-key-pair.pem
    StrictHostKeyChecking no

Host private-ec2
    HostName 10.0.3.122
    User ec2-user
    IdentityFile C:\Users\HP\.ssh\demo-private-key-pair.pem
    ProxyJump bastion          ← yahi magic hai
    StrictHostKeyChecking no
```

---

## Key Point — Keys Laptop Par Hi Rehti Hain

```
ProxyJump mein Bastion ka kaam:
✅ TCP traffic forward karna (10.0.3.122:22 tak)
❌ Bastion khud koi authentication nahi karta private EC2 ke liye
❌ Key bastion pe copy nahi hoti

Keys kaun use karta hai:
rajesh-key-pair     → Laptop ──► Bastion     (tumhare laptop se)
demo-private-key    → Laptop ──► Private EC2  (tunneled through bastion)

Dono keys tumhare LAPTOP par rehti hain
Bastion sirf ek TCP PIPE ki tarah kaam karta hai
```

---

## Bina Jump ke Private EC2 Access IMPOSSIBLE Kyun

```
Internet pe 10.0.3.122 ka koi route nahi hai
    │
    ▼
Direct access: ❌ timeout / connection refused

Sirf Bastion ke through rasta hai:
Internet → Bastion (public IP) → Private EC2 (private IP)
```

---

## Real Commands Jo Chale

```bash
# Local Windows CMD se
C:\Users\HP\.ssh> ssh private-ec2

# Result
[ec2-user@ip-10-0-3-122 ~]$   ← Private EC2 mein hain

# NAT Gateway proof
[ec2-user@ip-10-0-3-122 ~]$ curl https://checkip.amazonaws.com
3.109.42.198   ← NAT Gateway ka EIP (private EC2 ka nahi)
```
