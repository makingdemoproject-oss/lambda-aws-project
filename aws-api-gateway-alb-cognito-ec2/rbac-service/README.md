# rbac-service

The **authentication + authorization + menu** service for the platform.

- Port: **4000**
- Schema: **rbac** (in the shared Postgres instance)
- Tables: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `menus`, `menu_permissions`, `refresh_tokens`
- Owns: the **only signer of JWTs**. Every other service verifies tokens locally using the shared `JWT_ACCESS_SECRET`.

## Endpoints (`/api/v1/...`)

| Method | Path                  | Auth           | Use                                                |
|--------|-----------------------|----------------|----------------------------------------------------|
| POST   | `/auth/register`      | ✗              | create a customer account                          |
| POST   | `/auth/login`         | ✗              | get access + refresh tokens                        |
| POST   | `/auth/refresh`       | ✗              | rotate refresh + get new access                    |
| POST   | `/auth/logout`        | bearer         | revoke the presented refresh (or all if none)      |
| GET    | `/auth/me`            | bearer         | current user + roles + permissions                 |
| GET    | `/users/me/menu`      | bearer         | navigation tree pruned to current permissions      |
| GET    | `/users`              | `user:read`    | list/search users                                  |
| PATCH  | `/users/:id/active`   | `user:manage`  | enable / disable a user                            |
| PUT    | `/users/:id/roles`    | `user:manage`  | overwrite a user's role set                        |
| GET    | `/roles`              | `role:manage`  | list                                               |
| POST   | `/roles`              | `role:manage`  | create + attach permissions                        |
| PATCH  | `/roles/:id`          | `role:manage`  | rename / replace permissions (non-system)          |
| DELETE | `/roles/:id`          | `role:manage`  | delete (non-system)                                |
| GET    | `/roles/permissions`  | `role:manage`  | full permission catalogue                          |

## Database

- One Postgres instance shared by the platform.
- Schema `rbac` is created by the first migration (`bootstrap-schema.js`).
- DB role `rbac_app` has DML on `rbac.*`. Other services (`ecommerce_app`, `chat_app`) are granted **SELECT only** on `rbac.users` so their cross-schema FKs to it stay valid.

## JWT

- `access` token: 15 min, signed with `JWT_ACCESS_SECRET`. Claims: `iss=rbac`, `aud=platform`, `sub=<userId>`, `email`.
- `refresh` token: 7 days. We persist only its **SHA-256 hash** in `refresh_tokens`.
- Rotation: every `/auth/refresh` revokes the presented token, issues a new pair. Replay (presenting a revoked token) revokes **all** tokens for that user.

Downstream services (`ecommerce-service`, `chat-service`) verify access tokens locally with the same secret and the same `iss/aud` — they never call back here per request.

## Running locally

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed       # creates super-admin: admin@example.com / Admin@12345
npm run dev
```

Smoke:
```bash
curl -s http://localhost:4000/api/v1/health
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin@12345"}' | jq
```

## Build & deploy

```bash
docker build -t rbac-service .
docker run --rm -p 4000:4000 --env-file .env rbac-service
```

CI/CD pipeline at `.github/workflows/ci-cd.yml` builds the image, runs the migration Job, then rolls the Deployment. K8s manifests in `k8s/`.
