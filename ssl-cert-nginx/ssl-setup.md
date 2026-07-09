# SSL Setup — Let's Encrypt + Nginx on EC2

## Current Setup

| Item | Value |
|---|---|
| Domain | `firstbyrajesh.duckdns.org` |
| EC2 IP | `13.207.251.13` |
| EC2 Instance | `i-0dda96ea16a03281d` |
| Security Group | `sg-0545778ef69ee6f6a` |
| Certificate | Let's Encrypt (free) |
| Expires | 2026-09-27 (auto-renew) |
| Nginx config | `/etc/nginx/nginx.conf` |
| Cert location | `/etc/letsencrypt/live/firstbyrajesh.duckdns.org/` |
| Web root | `/usr/share/nginx/html/` |
| Live URL | `https://firstbyrajesh.duckdns.org` |

---

## How It Works

```
Browser → http://firstbyrajesh.duckdns.org (port 80)
  ↓ nginx: 301 redirect
Browser → https://firstbyrajesh.duckdns.org (port 443)
  ↓ nginx: SSL handshake (Let's Encrypt cert)
  ↓ serve /usr/share/nginx/html/ (React build)
  ↓ /api/v1/* → proxy to Express :4000
  ↓ 🔒 Green Lock ✅
```

---

## Fresh EC2 Par Setup Karna (dobara karna ho to)

### Step 1 — Security Group mein ports open karo

```bash
# Port 80 (HTTP)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0545778ef69ee6f6a \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 --region ap-south-1

# Port 443 (HTTPS)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0545778ef69ee6f6a \
  --protocol tcp --port 443 --cidr 0.0.0.0/0 --region ap-south-1
```

### Step 2 — Nginx install + config copy karo (SSM se)

```bash
aws ssm send-command --document-name "AWS-RunShellScript" \
  --instance-ids "i-0dda96ea16a03281d" \
  --parameters '{"commands":["dnf install -y nginx && systemctl enable nginx && systemctl start nginx"]}' \
  --region ap-south-1
```

### Step 3 — nginx.conf mein server_name set karo

```bash
# server_name update karo
aws ssm send-command --document-name "AWS-RunShellScript" \
  --instance-ids "i-0dda96ea16a03281d" \
  --parameters '{"commands":["sed -i \"s/server_name _;/server_name firstbyrajesh.duckdns.org;/g\" /etc/nginx/nginx.conf && nginx -t && systemctl reload nginx"]}' \
  --region ap-south-1
```

### Step 4 — Certbot install karo

```bash
aws ssm send-command --document-name "AWS-RunShellScript" \
  --instance-ids "i-0dda96ea16a03281d" \
  --parameters '{"commands":["dnf install -y python3-certbot-nginx && echo DONE"]}' \
  --region ap-south-1
```

### Step 5 — Certificate lo (Let's Encrypt)

```bash
aws ssm send-command --document-name "AWS-RunShellScript" \
  --instance-ids "i-0dda96ea16a03281d" \
  --parameters '{"commands":["certbot --nginx -d firstbyrajesh.duckdns.org --non-interactive --agree-tos -m makingdemoproject@gmail.com --redirect 2>&1"]}' \
  --region ap-south-1
```

### Step 6 — Certificate manually install karo (agar auto-install fail ho)

```bash
aws ssm send-command --document-name "AWS-RunShellScript" \
  --instance-ids "i-0dda96ea16a03281d" \
  --parameters '{"commands":["certbot install --cert-name firstbyrajesh.duckdns.org --nginx --non-interactive 2>&1"]}' \
  --region ap-south-1
```

### Step 7 — Test karo

```bash
curl -sI https://firstbyrajesh.duckdns.org | head -5
# Expected: HTTP/1.1 200 OK
```

---

## Nginx Config Explanation

```nginx
# Port 443 — HTTPS server
server {
    server_name firstbyrajesh.duckdns.org;

    # React app serve karo
    location / {
        root /usr/share/nginx/html;    # React build yahan hai
        try_files $uri $uri/ /index.html;  # SPA routing ke liye
    }

    # API requests backend pe bhejo
    location /api/v1 {
        proxy_pass http://127.0.0.1:4000;  # Express server
    }

    # SSL Certificate (Certbot managed)
    listen 443 ssl;
    ssl_certificate     /etc/letsencrypt/live/firstbyrajesh.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/firstbyrajesh.duckdns.org/privkey.pem;
}

# Port 80 — HTTP ko HTTPS pe redirect karo
server {
    listen 80;
    server_name firstbyrajesh.duckdns.org;
    return 301 https://$host$request_uri;  # permanent redirect
}
```

---

## Certificate Files (EC2 par)

| File | Kya hai |
|---|---|
| `/etc/letsencrypt/live/.../fullchain.pem` | Public cert (browser ko dikhao) |
| `/etc/letsencrypt/live/.../privkey.pem` | Private key (secret rakho!) |
| `/etc/letsencrypt/options-ssl-nginx.conf` | Security settings (TLS version etc) |
| `/etc/letsencrypt/ssl-dhparams.pem` | Diffie-Hellman params |

---

## Auto-Renew

Certbot ne automatically ek cron job set kar diya:
```bash
# Verify karo
cat /etc/cron.d/certbot

# Manually renew karo (test)
certbot renew --dry-run
```

Certificate 90 din mein expire hoti hai — Certbot 60 din pehle khud renew karega.

---

## DuckDNS Free Domain

- Site: https://www.duckdns.org
- Domain: `firstbyrajesh.duckdns.org`
- Points to: `13.207.251.13`
- Free forever, no credit card needed
- IP update karna ho: DuckDNS dashboard → Update IP
