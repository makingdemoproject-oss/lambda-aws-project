# D:\lambda-project\lambda-aws-project — Complete Project Overview

## Project Architecture — Big Picture

```
                        INTERNET
                            │
                    firstbyrajesh.duckdns.org (HTTPS)
                            │
                    ┌───────▼────────┐
                    │  Nginx + SSL   │  express-service-production EC2
                    │  EC2 :443      │  i-0df96941493b68f99
                    └───────┬────────┘
                            │
          ┌─────────────────┼──────────────────────┐
          ▼                 ▼                       ▼
    /api-ec2/         /proxy-k3s-*            /proxy-alb/
    EC2 :3002         K3s Node :30080/30081    ALB (deleted)
          │                 │
          ▼                 ▼
  Express Orders API   K8s pods
  (port 3002)         (express-api, products-api)
```

---

## Folder Structure — हर folder का काम

```
D:\lambda-project\lambda-aws-project\
│
├── aws-api-gateway-alb-cognito-ec2\    ← Main project (Cognito + API GW + ALB + EC2)
├── api-gateway-ec2\                    ← Simple API Gateway + EC2 authorizer demo
├── ec2-services\                       ← EC2 microservices (products, orders, web-app)
├── eventbridge-ecs\                    ← EventBridge → ECS/SQS/SNS flow
├── event-logger\                       ← Lambda that logs events to PostgreSQL
├── event-dynamo-writer\                ← Lambda that writes events to DynamoDB
├── notification-consumer\              ← SQS consumer for notifications
├── s3-sqs-lambda-dynamodb\             ← S3 upload → SQS → Lambda → DynamoDB
├── step-functions\                     ← AWS Step Functions order workflow
├── k8s-ec2\                            ← Kubernetes (K3s) deployment manifests
├── lambda-authorizer-api-gateway\      ← Custom Lambda Authorizer + Express backend
├── eks\                                ← EKS setup notes
├── vpc\                                ← VPC + Bastion + SSH docs + CloudFormation
├── ssl-cert-nginx\                     ← SSL certificates + Nginx config
├── route53\                            ← Route53 nginx config copy
└── web-app-changes.zip                 ← Backup
```

---

## Module 1 — aws-api-gateway-alb-cognito-ec2 (Main Project)

### Architecture

```
Browser
  │
  ├─ POST /auth/login
  │       │
  │       ▼
  │   Cognito CUSTOM_AUTH
  │   (define-auth + verify-auth Lambda triggers)
  │       │
  │       ▼ JWT AccessToken
  │
  ├─ API calls with Bearer token
  │       │
  │       ▼
  │   API Gateway HTTP API (wxv12mu6bg)
  │   JWT Authorizer → Cognito Pool ap-south-1_DsHwA8dVJ
  │       │
  │       ▼
  │   ALB (deleted — recreate when needed)
  │       │
  │   ├── /api/app/*     → EC2-1 :3001  (products-service)
  │   ├── /api/orders/*  → EC2-3 :3002  (orders-service)
  │   └── /api/v1/*      → EC2-2 :80    (nginx → rbac-service :4000)
```

### Sub-folders

```
aws-api-gateway-alb-cognito-ec2\
│
├── web-app\                    ← React frontend (Vite)
│   └── src\pages\
│       ├── ShopPage.jsx            Main nav
│       ├── ApiGatewayPage.jsx      API GW demo
│       ├── Route53Page.jsx         Route53 + ALB + K3s demo
│       ├── KubernetesPage.jsx      K8s pods demo
│       ├── NotificationsPage.jsx   SES + SNS + SQS bulk demo
│       └── VpcPage.jsx             VPC dashboard
│
├── express-service\            ← EC2-1 Products & Orders API (port 3001)
│   └── index.js                    GET/POST /api/app/products, /api/app/orders
│
├── rbac-service\               ← EC2-2 RBAC service (nginx:80 → node:4000)
│   └── index.js                    Role-based access control
│
├── lambda-auth-rds\            ← Lambda Authorizer + Auth API
│   ├── cloudformation.yaml         Lambda + API GW + VPC setup
│   └── schema.sql                  PostgreSQL tables (users, lambda_users)
│
├── cognito-client\             ← Cognito login client (Node.js)
│   └── index.js                    InitiateAuth + RespondToAuthChallenge
│
├── cognito-lambda-triggers\    ← Custom Auth Lambda triggers
│   ├── define-auth-challenge.js    Step 1: issue challenge
│   ├── create-auth-challenge.js    Step 2: create challenge
│   └── verify-auth-challenge.js    Step 3: verify → call EC2 /auth/login
│
├── cloudformation\
│   └── alb-cognito-apigw.yaml      Full ALB + Cognito + API GW CloudFormation
│
└── FLOW.md                     ← Complete auth flow documentation
```

### Cognito Custom Auth Flow

```
Step 1: InitiateAuth(CUSTOM_AUTH, username=email)
           → DefineAuthChallenge Lambda → issue CUSTOM_CHALLENGE

Step 2: RespondToAuthChallenge(ANSWER: {email, password})
           → VerifyAuthChallenge Lambda
           → POST http://EC2-2/api/auth/login
           → PostgreSQL bcrypt verify
           → success: true

Step 3: Cognito returns JWT AccessToken
           → Used as Authorization: Bearer <token>
```

### Lambda Auth RDS API (Separate from Cognito)

```
API Gateway URL: https://ixthoe12fe.execute-api.ap-south-1.amazonaws.com/prod

Routes:
GET  /health                 → health check
POST /auth/register          → create user in PostgreSQL
POST /auth/login             → verify password, return JWT
GET  /orders                 → fetch orders from RDS (JWT required)
GET  /orders/:id             → single order
POST /orders                 → create order
GET  /products               → fetch products
GET  /products/:id           → single product
GET  /notify/recipients      → fetch lambda_users for bulk notify
POST /notify/send-bulk       → trigger SQS bulk email/SMS
```

---

## Module 2 — api-gateway-ec2

```
Simple API Gateway + Lambda Authorizer demo

api-gateway-ec2\
├── authorizer\index.js     ← Lambda authorizer (validates JWT)
├── backend\server.js       ← Express backend on EC2
└── cloudformation.yaml     ← API GW + Lambda + EC2 CloudFormation
```

---

## Module 3 — ec2-services

```
3 EC2 microservices + web-app

ec2-services\
├── ec1-express-service\    ← Products service (port 3001)
├── ec1-products-service\   ← Products service alternate
├── ec3-order-service\      ← Orders service + SQS consumer
└── web-app\                ← React frontend (same as main web-app)
```

---

## Module 4 — eventbridge-ecs (EventBridge Flow)

### Architecture

```
Browser → POST /publish
              │
              ▼
         Lambda (publishEvent.js)
              │
              ▼
         EventBridge Bus
              │
    ┌─────────┼─────────┬──────────┐
    ▼         ▼         ▼          ▼
 Lambda     SQS       SNS        ECS Task
(store)   (queue)   (notify)   (process)
    │         │         │
    ▼         ▼         ▼
DynamoDB  SQS Consumer  Email/SMS
(event log) (sqsConsumer)
```

### Files

```
eventbridge-ecs\
├── src\
│   ├── publishEvent.js     ← PUT event to EventBridge
│   ├── eventHandler.js     ← Lambda: stores event to DynamoDB
│   ├── sqsConsumer.js      ← Lambda: reads SQS queue
│   ├── snsConsumer.js      ← Lambda: SNS notification handler
│   ├── getEvents.js        ← GET events from DynamoDB
│   ├── publishEvent.js     ← POST to publish event
│   └── health.js           ← Health check
├── app\
│   ├── Dockerfile          ← ECS container
│   └── index.js            ← ECS task processor
└── cloudformation.yaml     ← Full stack (EventBridge + Lambda + SQS + SNS + ECS + DynamoDB)
```

---

## Module 5 — s3-sqs-lambda-dynamodb

### Architecture

```
User uploads file
      │
      ▼
S3 Bucket (file upload)
      │
      ▼ S3 Event Notification
SQS Queue
      │
      ▼ SQS Trigger
Lambda (sqsConsumer.js)
      │
      ▼
DynamoDB (UPLOADS_TABLE)
      │
      └── fileId, fileName, s3Key, bucket, fileSize, status
```

### Files

```
s3-sqs-lambda-dynamodb\
├── src\
│   ├── sqsConsumer.js      ← Reads SQS → writes to DynamoDB
│   ├── presignedUrl.js     ← Generate S3 presigned URL for upload
│   ├── getUploads.js       ← GET all uploads from DynamoDB
│   └── health.js           ← Health check
└── cloudformation.yaml     ← S3 + SQS + Lambda + DynamoDB stack
```

---

## Module 6 — step-functions

### Architecture

```
POST /start-execution
      │
      ▼
Step Functions State Machine
      │
   ┌──┴─────────────────────────────────┐
   │  State 1: ValidateOrder (Lambda)   │
   │  State 2: SaveOrder (Lambda→DDB)   │
   │  State 3: NotifySQS (Lambda→SQS)   │
   │  State 4: NotifySNS (Lambda→SNS)   │
   │  State 5: TriggerECS (Lambda→SQS)  │
   └────────────────────────────────────┘
```

### Files

```
step-functions\
├── src\
│   ├── startExecution.js   ← POST → start Step Function execution
│   ├── validate.js         ← Lambda: validate order data
│   ├── saveResult.js       ← Lambda: save to DynamoDB
│   ├── processLambda.js    ← Lambda: process step
│   ├── getExecution.js     ← GET execution status
│   └── listExecutions.js   ← List all executions
└── cloudformation.yaml     ← Step Functions + Lambda + DynamoDB + SQS + SNS
```

---

## Module 7 — event-logger + event-dynamo-writer

```
event-logger\
├── index.js        ← Lambda: logs events to PostgreSQL (RDS)
├── migration.sql   ← CREATE TABLE events (...)
└── package.json

event-dynamo-writer\
├── index.js        ← Lambda: writes events to DynamoDB
└── package.json
```

---

## Module 8 — notification-consumer

```
notification-consumer\
├── index.js        ← SQS consumer → sends SES email or SNS SMS
└── package.json

Flow:
SQS (email-queue / sms-queue)
      │
      ▼ SQS trigger
notification-consumer Lambda
      │
      ├── SES → email
      └── SNS → SMS
```

---

## Module 9 — k8s-ec2 (Kubernetes)

### Running on EC2: k8s-docker-express-production (13.201.138.12)

```
k8s-ec2\
├── k8s-manifests\
│   ├── express-deployment.yaml     ← Orders API pod (NodePort 30080)
│   ├── products-deployment.yaml    ← Products API pod (NodePort 30081)
│   ├── radio-booking-deployment.yaml
│   └── pod-to-pod.yaml
├── orders-deployment.yaml
├── orders-service.yaml
├── products-deployment.yaml
├── products-service.yaml
└── cloudformation.yaml             ← EC2 + K3s setup
```

### Services

| Service | NodePort | Path |
|---|---|---|
| express-api (orders) | 30080 | /orders, /orders/:id |
| products-api | 30081 | /products, /products/:id |

### Sample IDs in DB
- Orders: `ord-002`
- Products: `pro-002`
- Users: `user-1`

---

## Module 10 — lambda-authorizer-api-gateway

```
Custom JWT Lambda Authorizer demo (separate from Cognito)

lambda-authorizer-api-gateway\
├── server.js                   ← Express backend (orders + pincodes API)
├── db.js                       ← PostgreSQL connection
├── middleware\
│   └── lambdaAuthorizer.js     ← JWT verify middleware
├── routes\
│   ├── auth.js                 ← /api/auth/login, /register
│   └── pincodes.js             ← /api/pincodes
└── nginx\nginx.conf            ← Nginx config for this service
```

---

## Module 11 — vpc (VPC Docs + CloudFormation)

```
vpc\
├── vpc-nat-nacl.yaml               ← CloudFormation: VPC + optional NAT + NACL
├── vpc-bastion-flow.md             ← Complete architecture with real IPs
├── proxyjump-explained.md          ← SSH ProxyJump kaise kaam karta hai
├── private-ec2-express-api.md      ← Private EC2 Express API setup
├── ssh-tunneling-port-forwarding.md ← SSH -N -L tunnel guide
└── localhost-tunnel-explained.md   ← localhost se private EC2 access

VPC Resources (alive — free):
  vpc-086bd228d1fe3cf3f  → 10.0.0.0/16
  4 subnets (2 public, 2 private)
  NACL: acl-00d56bdb31da155c1
  NAT: DELETED | Bastion EC2: TERMINATED | Private EC2: TERMINATED
```

---

## Module 12 — ssl-cert-nginx

```
ssl-cert-nginx\
├── nginx.conf          ← Main nginx config with all proxy locations
├── ssl-setup.md        ← SSL setup guide (Let's Encrypt + DuckDNS)
├── fullchain.pem       ← SSL certificate (DO NOT commit privkey.pem)
└── WARNING.txt         ← Security warning

Domain: firstbyrajesh.duckdns.org

Proxy locations:
  /api-ec2/              → http://13.200.198.212:3002/
  /proxy-alb/            → http://host-routing-alb.../
  /proxy-k3s-orders/     → http://13.201.138.12:30080/
  /proxy-k3s-products/   → http://13.201.138.12:30081/
```

---

## EC2 Instances — Current State (STOPPED 2026-07-06)

| Instance ID | Name | Last IP | Purpose | Port |
|---|---|---|---|---|
| i-0df96941493b68f99 | express-service-production | 13.200.198.212 | Nginx/SSL + Express API | 3002 |
| i-0dda96ea16a03281d | PostgreSQL-Server | 13.207.251.13 | RBAC Service (nginx:80 → node:4000) | 80/4000 |
| i-047c34dc75cb9af43 | order-processing-ec2-production | 13.233.252.1 | Orders Service | 3002 |
| i-07add1a41efea7651 | k8s-docker-express-production | 13.201.138.12 | K3s Kubernetes Node | 30080/30081 |

**⚠️ Note:** IPs change on restart (no Elastic IPs). After restart:
1. Update nginx.conf on SSL EC2 with new K3s IP
2. Update React pages if express-service-production IP changes

---

## RDS PostgreSQL — STOPPED

```
Identifier : postgres-production
Endpoint   : postgres-production.cn2yekq0q1tg.ap-south-1.rds.amazonaws.com
Port       : 5432
DB         : orderdb
Username   : appuser
VPC        : vpc-065599aca72278f93
Stack      : rds-postgres-production
```

**Tables:** orders, products, users, lambda_users, outbox (if created)

---

## Lambda Functions (always on — no EC2 needed)

| Lambda | Purpose |
|---|---|
| lambda-auth-rds handlers | Auth + Orders + Products + Notify APIs |
| fetch-recipients | Queries lambda_users from RDS (VPC attached) |
| send-bulk | Pushes to SQS email/sms queue (non-VPC) |
| notification-consumer | SQS → SES email / SNS SMS |
| EventBridge handlers | publishEvent, eventHandler, sqsConsumer |
| Step Functions lambdas | validate, save, notify, process |
| Cognito triggers | define-auth, create-auth, verify-auth |

---

## API Gateway Endpoints

```
Main: https://ixthoe12fe.execute-api.ap-south-1.amazonaws.com/prod

GET  /health
POST /auth/register
POST /auth/login
GET  /orders
GET  /orders/:id
POST /orders
GET  /products
GET  /products/:id
GET  /notify/recipients
POST /notify/send-bulk
```

---

## SES / SNS / SQS Setup

```
SES Sandbox:
  Sender:    demo-notif-36508@yopmail.com
  Recipient: demo-notif-36508@yopmail.com (both must be verified in sandbox)

SNS SMS (India — blocked by TRAI DLT):
  Registered sender ID needed for India SMS
  API call succeeds but carrier drops message

SQS Queues:
  email-queue     → consumer Lambda → SES
  sms-queue       → consumer Lambda → SNS
  email-queue-dlq → failed emails
  sms-queue-dlq   → failed SMS
```

---

## Cognito

```
Pool ID: ap-south-1_DsHwA8dVJ
Region: ap-south-1
Auth: CUSTOM_AUTH (custom Lambda triggers)
JWT: Used as Bearer token in API Gateway
Status: ALIVE (free tier — never delete)
```

---

## Restart Checklist (जब दोबारा चालू करना हो)

```bash
# 1. EC2 start करो
aws ec2 start-instances --region ap-south-1 \
  --instance-ids i-0df96941493b68f99 i-0dda96ea16a03281d \
                 i-047c34dc75cb9af43 i-07add1a41efea7651

# 2. New IPs note करो
aws ec2 describe-instances --region ap-south-1 \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].[Tags[?Key=='Name'].Value|[0],PublicIpAddress]" \
  --output table

# 3. RDS start करो (अगर auto-start नहीं हुई)
aws rds start-db-instance --region ap-south-1 \
  --db-instance-identifier postgres-production

# 4. ECS scale up करो
aws ecs update-service --cluster ec2-events-cluster-production \
  --service ec2-events-service-production \
  --desired-count 1 --region ap-south-1

# 5. ALB recreate करो (agar chaaho)
# → aws-api-gateway-alb-cognito-ec2/cloudformation/alb-cognito-apigw.yaml deploy karo

# 6. Nginx EC2 pe config update karo (new IPs ke liye)
# → ssh into express-service-production EC2
# → sudo nano /etc/nginx/nginx.conf
# → new k3s IP update karo
# → sudo nginx -s reload
```

---

## Security Rules

```
❌ .env files NEVER commit to git
❌ privkey.pem NEVER commit to git (ssl-cert-nginx/privkey.pem)
❌ Production servers ko ping mat karo
❌ Existing code ya tasks delete mat karo repo se
```
