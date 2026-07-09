# web-app

Single React (Vite) SPA that talks to **rbac-service**, **ecommerce-service**, and **chat-service** through one hostname. The ALB ingress (or nginx fallback in this image) routes by path:

| Path prefix          | Backend             | Port |
|----------------------|---------------------|------|
| `/api/v1/chat/*`     | chat-service        | 4001 |
| `/socket.io/*`       | chat-service        | 4001 |
| `/api/v1/products/*`<br>`/api/v1/categories/*`<br>`/api/v1/cart/*`<br>`/api/v1/orders/*`<br>`/api/v1/addresses/*` | ecommerce-service | 4002 |
| `/api/v1/*` (default) | rbac-service       | 4000 |
| `/*`                 | this SPA (nginx)    | 80   |

## Running locally

```bash
npm install
cp .env.example .env       # optional — defaults work
npm run dev                # http://localhost:5173, proxies match production
```

In dev, Vite proxies the three backends to ports 4000/4001/4002 — start them in their own folders first.

## Login

After `infra/rabbitmq-config` and the three services have been migrated + seeded, the rbac seeder creates `admin@example.com` / `Admin@12345`. The login page pre-fills these.

## Build & deploy

```bash
docker build -t web-app .
```

The production image bakes the built SPA into nginx and ships fallback proxy rules in `nginx.conf` so the container works even outside the ALB ingress.

CI/CD pipeline at `.github/workflows/ci-cd.yml`. K8s ingress + Service + Deployment at `k8s/`.
