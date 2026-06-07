# SIMS Pro Custom Domains

This setup lets every school use the same Next.js frontend, NestJS backend, and PostgreSQL database while resolving tenant data from the request hostname.

## 1) Data model

Each school now supports:

- `customDomain` — e.g. `ccschoolportal.in`
- `subdomain` — e.g. `guru-nanak` for `guru-nanak.simspro.in`

The backend resolves a school from:

1. Exact `customDomain`
2. `subdomain` under `PRIMARY_DOMAIN` / `SAAS_DOMAIN`
3. JWT `schoolId` fallback

---

## 2) DNS configuration

### A. SaaS domain: `simspro.in`

Point the main domain to your VPS:

| Type | Name | Value | Notes |
|---|---|---|---|
| `A` | `@` | `<VPS_PUBLIC_IP>` | Apex domain |
| `A` | `www` | `<VPS_PUBLIC_IP>` | Optional |
| `A` | `*` | `<VPS_PUBLIC_IP>` | Wildcard subdomains like `school1.simspro.in` |

### B. School custom domain: `ccschoolportal.in`

For a school-owned domain, point it to the same VPS:

| Type | Name | Value | Notes |
|---|---|---|---|
| `A` | `@` | `<VPS_PUBLIC_IP>` | Root domain |
| `CNAME` | `www` | `ccschoolportal.in` | Optional |

If the school wants `portal.ccschoolportal.in`, add:

| Type | Name | Value |
|---|---|---|
| `A` | `portal` | `<VPS_PUBLIC_IP>` |

### C. Future school custom domains

Repeat the same pattern for every school domain:

- Apex `A` record to the VPS IP
- Optional `www` CNAME to apex
- Optional extra subdomains to the VPS IP

---

## 3) Nginx configuration

Use one reverse proxy for all domains and subdomains.

```nginx
server {
    listen 80;
    server_name simspro.in www.simspro.in *.simspro.in ccschoolportal.in www.ccschoolportal.in;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name simspro.in www.simspro.in *.simspro.in ccschoolportal.in www.ccschoolportal.in;

    ssl_certificate     /etc/letsencrypt/live/simspro.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/simspro.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    client_max_body_size 25m;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Important:

- Keep `proxy_set_header Host $host;` so NestJS can read the real school domain.
- Keep `X-Forwarded-Host` for apps behind extra proxies/CDNs.

---

## 4) SSL certificate setup

### For `simspro.in` and `*.simspro.in`

Wildcard certificates require **DNS-01** validation.

Recommended approach:

1. Issue an apex certificate for `simspro.in`
2. Issue a wildcard certificate for `*.simspro.in` using DNS-01
3. Store both in `/etc/letsencrypt/live/`

Example:

```bash
sudo certbot certonly --nginx -d simspro.in -d www.simspro.in
sudo certbot certonly --manual --preferred-challenges dns -d '*.simspro.in' -d simspro.in
```

### For `ccschoolportal.in`

Issue a dedicated certificate:

```bash
sudo certbot certonly --nginx -d ccschoolportal.in -d www.ccschoolportal.in
```

If you manage many school domains, automate via:

- a DNS provider with API support
- wildcard per school only when the school owns a delegated zone
- or terminate SSL at Cloudflare / another edge proxy

---

## 5) Hostinger VPS deployment steps

1. Provision Ubuntu VPS on Hostinger.
2. Install system packages:
   ```bash
   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx git
   ```
3. Install Node.js LTS, npm, and PostgreSQL client tools as needed.
4. Clone the repository onto the VPS.
5. Configure environment variables:
   - backend: `DATABASE_URL`, `JWT_SECRET`, `PRIMARY_DOMAIN=simspro.in`
   - frontend: `NEXT_PUBLIC_API_URL=https://simspro.in/api/v1` or your API host
6. Build and start:
   ```bash
   npm run build:backend
   npm run build:frontend
   ```
7. Run backend and frontend with a process manager:
   - `pm2`
   - `systemd`
   - or Docker Compose
8. Configure Nginx with the proxy rules above.
9. Issue and renew certificates.
10. Test these flows:
   - `simspro.in`
   - `guru-nanak.simspro.in`
   - `ccschoolportal.in`
   - login, dashboard, and profile loading

---

## 6) Production best practices for hundreds of domains

- Store tenant lookup keys in indexed fields (`customDomain`, `subdomain`).
- Cache hostname-to-school resolution in Redis or memory with a short TTL.
- Normalize hostnames before lookup:
  - lowercase
  - strip `www.`
  - strip ports
  - handle `X-Forwarded-Host`
- Keep API auth token-based; avoid relying on cookies across many domains.
- Use one shared frontend/backend stack behind Nginx or a load balancer.
- Automate school onboarding so domain + branding are saved together.
- Store branding in `SchoolSetting` so the model stays extensible.
- Use per-school rate limits for login and public bootstrap endpoints.
- Monitor certificate expiry and renew automatically.
- Log `hostname`, `schoolId`, and `resolvedBy` for each request.
- Prefer DNS automation or an edge proxy when custom domains scale beyond manual certificate management.

