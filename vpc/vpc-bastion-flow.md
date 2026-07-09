# VPC + Bastion + NAT Gateway — Complete Flow

## Real IPs & Resources (Deployed)

| Resource | ID / IP | Details |
|---|---|---|
| VPC | vpc-086bd228d1fe3cf3f | 10.0.0.0/16 |
| Public Subnet 1a | subnet-01e1bdda28a95b51c | 10.0.1.0/24, ap-south-1a |
| Public Subnet 1b | subnet-06c10087b60547980 | 10.0.2.0/24, ap-south-1b |
| Private Subnet 1a | subnet-03f1ceaf9e34edf75 | 10.0.3.0/24, ap-south-1a |
| Private Subnet 1b | subnet-0ba84e2652a3ec4bc | 10.0.4.0/24, ap-south-1b |
| Internet Gateway | igw-xxx | Public subnet ko internet |
| NAT Gateway | nat-0da31a23c2abeb0a8 | EIP: 3.109.42.198 |
| Bastion EC2 | i-0029294ce8f11d4e6 | Public IP: 13.201.118.213 |
| Private EC2 | i-0243f57f5807d91c6 | Private IP: 10.0.3.122 (no public) |
| Bastion SG | sg-0d03ab35f34efb191 | SSH :22 from 0.0.0.0/0 |
| Private SG | sg-00e0a49a2643c92dc | SSH :22 from Bastion SG only |
| NACL | acl-00d56bdb31da155c1 | HTTP/HTTPS/SSH allow |
| Key - Bastion | rajesh-key-pair.pem | C:\Users\HP\.ssh\ |
| Key - Private | demo-private-key-pair.pem | C:\Users\HP\.ssh\ |

---

## Flow 1 — SSH Access (Laptop → Bastion → Private EC2)

```
Tumhara Laptop (Windows)
C:\Users\HP\.ssh\
├── rajesh-key-pair.pem       ← Bastion ke liye
└── demo-private-key-pair.pem ← Private EC2 ke liye
        │
        │ Command: ssh private-ec2
        │ (~/.ssh/config ne handle kiya)
        │
        ↓ TCP :22 (public internet)
┌─────────────────────────────────┐
│  Bastion EC2                    │
│  Public IP:  13.201.118.213     │
│  Private IP: 10.0.1.221         │
│  Subnet: Public 10.0.1.0/24     │
│  Key: rajesh-key-pair.pem       │
│  SG: SSH from anywhere ✅        │
└─────────────────────────────────┘
        │
        │ ProxyJump (automatic via config)
        │ TCP :22 (private VPC network)
        │
        ↓
┌─────────────────────────────────┐
│  Private EC2                    │
│  Public IP:  ❌ NONE            │
│  Private IP: 10.0.3.122         │
│  Subnet: Private 10.0.3.0/24    │
│  Key: demo-private-key-pair.pem │
│  SG: SSH only from Bastion SG   │
└─────────────────────────────────┘
```

### ~/.ssh/config (jo likha tha)

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
    ProxyJump bastion
    StrictHostKeyChecking no
```

### Command

```bash
ssh private-ec2
# → automatically bastion se hop karke private EC2 mein
```

---

## Flow 2 — Internet Access (Private EC2 → NAT → Internet)

```
Private EC2 (10.0.3.122)
    │
    │ curl https://checkip.amazonaws.com
    │ (internet request)
    ↓
Private Route Table
    Destination    Target
    10.0.0.0/16 → local        (VPC internal)
    0.0.0.0/0   → NAT Gateway  (internet ke liye)
    │
    ↓
NAT Gateway (nat-0da31a23c2abeb0a8)
    Location: Public Subnet 10.0.1.0/24
    Elastic IP: 3.109.42.198
    │
    │ Private EC2 ka IP (10.0.3.122) replace karke
    │ apna EIP (3.109.42.198) lagata hai
    ↓
Public Route Table
    Destination    Target
    0.0.0.0/0   → Internet Gateway
    │
    ↓
Internet Gateway → Internet
    │
    ↓
checkip.amazonaws.com → "3.109.42.198 se request aayi"
    │
    ↓ Response wapas same path se
NAT Gateway → Private EC2

Result:
    curl response: 3.109.42.198   ← NAT EIP (private EC2 ka IP nahi)
```

---

## Flow 3 — Why Private EC2 Directly Accessible NAHI Hai

```
Hacker tries:
    curl http://10.0.3.122  ← Private IP, internet pe route nahi
    → Request internet pe jaati hi nahi (RFC1918 private range)

    curl http://3.109.42.198 ← NAT ka EIP
    → NAT Gateway sirf OUTBOUND traffic handle karta hai
    → Inbound directly private EC2 tak nahi jaata
    → Connection refused / timeout

Conclusion:
    Private EC2 internet se COMPLETELY HIDDEN hai ✅
    Sirf Bastion ke through accessible hai
```

---

## Security Group Rules — Kaise Connect Hote Hain

```
Security Group: demo-bastion-sg (sg-0d03ab35f34efb191)
┌─────────────────────────────────────────────────┐
│ INBOUND                                          │
│ TCP :22  from 0.0.0.0/0  → ALLOW               │
│ (anyone SSH kar sakta hai bastion pe)            │
├─────────────────────────────────────────────────┤
│ OUTBOUND                                         │
│ All traffic → ALLOW                              │
└─────────────────────────────────────────────────┘

Security Group: demo-private-ec2-sg (sg-00e0a49a2643c92dc)
┌─────────────────────────────────────────────────┐
│ INBOUND                                          │
│ TCP :22    from sg-0d03ab35f34efb191 → ALLOW    │
│ (sirf Bastion SG se SSH allowed)                │
│ TCP :3000  from sg-0d03ab35f34efb191 → ALLOW    │
│ (Express app access, sirf Bastion se)           │
├─────────────────────────────────────────────────┤
│ OUTBOUND                                         │
│ All traffic → ALLOW (NAT se internet)           │
└─────────────────────────────────────────────────┘
```

---

## NACL Rules (Public Subnet par)

```
Network ACL: acl-00d56bdb31da155c1

INBOUND:
Rule  Type       Protocol  Port        Source      Action
100   HTTP       TCP       80          0.0.0.0/0   ALLOW
110   HTTPS      TCP       443         0.0.0.0/0   ALLOW
120   SSH        TCP       22          0.0.0.0/0   ALLOW
130   Ephemeral  TCP       1024-65535  0.0.0.0/0   ALLOW
*     All        All       All         0.0.0.0/0   DENY

OUTBOUND:
Rule  Type       Protocol  Port  Dest       Action
100   All        All       All   0.0.0.0/0  ALLOW
*     All        All       All   0.0.0.0/0  DENY

Note: ICMP (ping) allowed nahi tha isliye ping fail hua.
      curl (HTTPS/TCP:443) → Rule 110 → ALLOW ✅
```

---

## Complete Architecture Diagram

```
                    INTERNET
                       │
                       │ (TCP :22 SSH)
                       │
              ┌────────▼─────────┐
              │  Internet Gateway │
              │  (IGW)            │
              └────────┬─────────┘
                       │
        ┌──────────────▼──────────────────┐
        │         PUBLIC SUBNET            │
        │         10.0.1.0/24              │
        │  ┌──────────────────────────┐   │
        │  │  Bastion EC2             │   │
        │  │  13.201.118.213 (public) │   │
        │  │  10.0.1.221 (private)    │   │
        │  │  Key: rajesh-key-pair    │   │
        │  └──────────┬───────────────┘   │
        │             │                   │
        │  ┌──────────▼───────────────┐   │
        │  │  NAT Gateway             │   │
        │  │  EIP: 3.109.42.198       │   │
        │  └──────────┬───────────────┘   │
        └─────────────┼───────────────────┘
                      │ (private VPC network)
        ┌─────────────▼───────────────────┐
        │         PRIVATE SUBNET           │
        │         10.0.3.0/24              │
        │  ┌───────────────────────────┐  │
        │  │  Private EC2              │  │
        │  │  10.0.3.122 (private only)│  │
        │  │  NO public IP ❌           │  │
        │  │  Key: demo-private-key    │  │
        │  └───────────────────────────┘  │
        └─────────────────────────────────┘

Route Tables:
Public RT:  0.0.0.0/0 → Internet Gateway
Private RT: 0.0.0.0/0 → NAT Gateway
```

---

## Proof — Sab Kuch Kaam Kiya

```bash
# Local se ek command mein private EC2 access
C:\Users\HP\.ssh> ssh private-ec2
[ec2-user@ip-10-0-3-122 ~]$

# Private EC2 se internet (NAT se)
[ec2-user@ip-10-0-3-122 ~]$ curl https://checkip.amazonaws.com
3.109.42.198   ← NAT Gateway ka IP (private EC2 ka nahi)
```

---

## CloudFormation Stack

```bash
# Deploy karna ho to
aws cloudformation deploy \
  --template-file vpc-nat-nacl.yaml \
  --stack-name demo-vpc-production \
  --parameter-overrides CreateNatGateway=true \
  --region ap-south-1

# Delete karna ho to (cost bachao)
aws cloudformation delete-stack \
  --stack-name demo-vpc-production \
  --region ap-south-1

# EC2 terminate karna ho
aws ec2 terminate-instances \
  --instance-ids i-0029294ce8f11d4e6 i-0243f57f5807d91c6 \
  --region ap-south-1
```
