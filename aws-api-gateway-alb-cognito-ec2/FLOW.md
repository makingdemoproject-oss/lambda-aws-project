# AWS API Gateway + ALB + Cognito CUSTOM_AUTH + 3 EC2s — Complete Flow

## Architecture Overview

```
Browser (http://13.200.198.212)
    │
    ▼
API Gateway HTTP API (wxv12mu6bg)
    │   JWT Authorizer (Cognito ap-south-1_DsHwA8dVJ)
    │
    ▼
INTERNET Integration → ALB (app-alb-production)
    │
    ├── /api/app/*    → express-tg-production  → EC2-1 :3001 (products-service)
    ├── /api/orders/* → orders-tg-production   → EC2-3 :3002 (orders-service)
    └── /api/v1/*     → rbac-tg-production     → EC2-2 :80   (nginx → rbac-service :4000)
```

---

## EC2 Instances

| Instance | Name | Private IP | Service | Port |
|----------|------|------------|---------|------|
| i-0df96941493b68f99 | express-service-production | 172.31.28.60 | products-service | 3001 |
| i-0dda96ea16a03281d | PostgreSQL-Server | 172.31.33.6 | rbac-service (nginx:80 → node:4000) | 80/4000 |
| i-047c34dc75cb9af43 | order-processing-ec2-production | 172.31.46.191 | orders-service | 3002 |

---

## 1. Cognito CUSTOM_AUTH Login Flow

```
Browser
  │
  ├─→ InitiateAuth(CUSTOM_AUTH, username=email)
  │       └─→ DefineAuthChallenge Lambda
  │               session=[] → issue CUSTOM_CHALLENGE
  │
  ├─→ RespondToAuthChallenge(ANSWER: {email, password})
  │       └─→ VerifyAuthChallenge Lambda
  │               └─→ POST http://EC2-2/api/auth/login (internal)
  │                       └─→ PostgreSQL verify (bcrypt)
  │                       └─→ success: true
  │       └─→ DefineAuthChallenge Lambda
  │               session[0].result=true → issueTokens=true
  │
  └─→ Cognito returns: AccessToken (JWT), IdToken, RefreshToken
```

**Result**: JWT (AccessToken) — used as `Authorization: Bearer <token>` in API Gateway calls.

---

## 2. API Gateway JWT Authorization

Every request to `ANY /api/app/{proxy+}`, `ANY /api/orders/{proxy+}`, `ANY /api/v1/{proxy+}` requires:
```
Authorization: Bearer <Cognito-AccessToken>
```

**CORS Preflight (OPTIONS)**:
- `OPTIONS /api/app/{proxy+}` → NONE auth → ALB → EC2-1 (returns 204)
- `OPTIONS /api/orders/{proxy+}` → NONE auth → ALB → EC2-3 (returns 204)
- `OPTIONS /api/v1/{proxy+}` → handled by API Gateway CORS config (returns 204)

---

## 3. ALB Path-Based Routing Rules

| Priority | Path Pattern | Target Group | EC2 |
|----------|-------------|--------------|-----|
| 1 | `/api/v1/*` | rbac-tg-production (port 80) | EC2-2 |
| 2 | `/api/orders/*` | orders-tg-production (port 3002) | EC2-3 |
| 3 | `/api/app/*` | express-tg-production (port 3001) | EC2-1 |

---

## 4. EC2-2 nginx → RBAC Service Proxy

```
Request: GET /api/v1/auth/me (with RBAC JWT)
    │
    ▼
ALB → EC2-2:80 (nginx)
    │
    │   /etc/nginx/conf.d/default.conf
    │   location /api/v1 {
    │       proxy_set_header Origin "";          ← strips client Origin (CORS fix)
    │       proxy_hide_header Access-Control-*;  ← hides backend CORS headers
    │       add_header Access-Control-Allow-Origin * always;
    │       proxy_pass http://127.0.0.1:4000;    ← rbac-service
    │   }
    │
    ▼
rbac-service (Node.js, PM2 cluster mode, port 4000)
    │
    ▼
PostgreSQL (local, port 5432, DB: rbacdb)
```

---

## 5. RBAC Service Structure

```
rbac-service/
├── src/
│   ├── app.js                  # Express app setup
│   ├── server.js               # Entry point (port 4000)
│   ├── config/index.js         # Config (reads .env)
│   ├── controllers/            # auth, role, user, menu
│   ├── middlewares/
│   │   ├── auth.js             # JWT verify middleware
│   │   ├── rbac.js             # Role-based access check
│   │   ├── security.js         # CORS config (reads CORS_ORIGIN env)
│   │   └── errorHandler.js
│   ├── models/                 # Sequelize models (PostgreSQL)
│   │   ├── user.model.js
│   │   ├── role.model.js
│   │   ├── permission.model.js
│   │   ├── userRole.model.js
│   │   └── rolePermission.model.js
│   ├── routes/                 # auth, role, user, menu
│   ├── services/               # auth, role, user, menu
│   ├── migrations/             # Sequelize DB migrations
│   ├── seeders/                # Bootstrap RBAC data
│   └── utils/                  # jwt, logger, ApiError, redis, sns
├── nginx.conf                  # nginx config for EC2-2
├── ecosystem.config.js         # PM2 config (cluster mode, 2 instances)
├── .env.example                # Environment variables template
└── package.json
```

---

## 6. Key API Endpoints

### RBAC Service (via ALB /api/v1/*)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/login` | None | Login → RBAC JWT |
| POST | `/api/v1/auth/register` | None | Register user |
| GET | `/api/v1/auth/me` | RBAC JWT | Current user info |
| GET | `/api/v1/health` | None | Health check |

### Products Service (via API GW + Cognito JWT → ALB /api/app/*)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/app/products` | List products |
| GET | `/api/app/users` | List users |
| GET | `/api/app/payments` | List payments |
| GET | `/api/app/inventory` | Inventory |
| GET | `/api/app/notifications` | Notifications |

### Orders Service (via API GW + Cognito JWT → ALB /api/orders/*)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders/orders` | List orders |
| GET | `/api/orders/shipping` | Shipping status |
| GET | `/api/orders/warehouse` | Warehouse info |
| GET | `/api/orders/dispatch` | Dispatch queue |
| GET | `/api/orders/tracking/history` | Tracking history |

---

## 7. CORS Fix

**Problem**: RBAC service had a whitelist of allowed Origins. Browser sends `Origin: http://13.200.198.212` which was not in the list → 500 "Not allowed by CORS".

**Fix**:
1. Set `CORS_ORIGIN=*` in rbac-service `.env` → allows all origins
2. nginx `proxy_set_header Origin ""` strips client Origin before forwarding
3. nginx `if ($request_method = OPTIONS) { return 204; }` handles preflight at server level

---

## 8. Proof: _server Field

Every JSON response from EC2-1 and EC2-3 includes:
```json
{
  "_server": {
    "ec2": "EC2-1 (express-service-production)",
    "service": "products-service",
    "host": "ip-172-31-28-60.ap-south-1.compute.internal",
    "privateIp": "172.31.28.60",
    "port": 3001,
    "path": "/"
  }
}
```
This proves which EC2 instance handled the request via ALB routing.

---

## 9. Infrastructure Resources

| Resource | ID/Name |
|----------|---------|
| API Gateway | wxv12mu6bg (rbac-http-api-production) |
| ALB | app-alb-production-108161327 |
| Cognito User Pool | ap-south-1_DsHwA8dVJ |
| Cognito Client ID | 20qlu1pvf3ev7a3hpl3l41dbrp |
| S3 Deploy Bucket | express-deploy-202606232329 |
| VPC | ap-south-1 |
| Test Web App | http://13.200.198.212 |
