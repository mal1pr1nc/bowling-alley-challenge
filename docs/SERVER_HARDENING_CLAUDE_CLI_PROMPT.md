# SERVER HARDENING — Claude Code CLI (root SSH)

> PRIORITY: CRITICAL. This server hosts a public demo about to be shared on LinkedIn.
> App-level security fixes are already committed and pushed to `origin/master`.
> This prompt covers SERVER-SIDE hardening via SSH to 46.225.109.178.

## YOUR ROLE

You are executing server-side security remediation on a Hetzner VPS.
You have root SSH access to 46.225.109.178.
Execute slices in order. Each slice is independent — report status after each one.
If a slice fails or doesn't apply (e.g., MySQL not installed), note it and move on.

## CONTEXT

- VPS: 46.225.109.178 (Hetzner, Ubuntu)
- SSH: root access
- Services: Nginx reverse proxy, Docker containers
- App: Bowling Alley Challenge at https://bowling-challenge.hivemind.rs/
- App repo on server: /home/deploy/bowling-alley-challenge (owned by user `deploy`)
- Docker: maps port 3150 (host) to 3001 (container)
- Nginx: proxies bowling-challenge.hivemind.rs to localhost:3150
- Other sites on same VPS: career.hivemind.rs (:3100), methodology.hivemind.rs (:3130), default (:3079)
- SSL: Certbot + Cloudflare proxy (cert expires April 20, 2026)

---

## SLICE 1: FIREWALL (do this FIRST)

Lock down ports. Only 80, 443, and 22 should accept inbound connections.

```bash
ssh root@46.225.109.178

# Check current state
ufw status

# If not active, set defaults and allow only essentials
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Nginx)
ufw allow 443/tcp   # HTTPS (Nginx)

# Enable (will prompt — answer yes)
ufw enable
ufw status verbose
```

This must close: FTP (21), Node dev ports (3000, 3001, 3079, 3100, 3130, 3150), MySQL (3306), PostgreSQL (5432), 8080, 8443, 9090.

**Verify** from the server itself:
```bash
ss -tlnp | grep -v "127.0.0.1\|::1"
```
Only ports 22, 80, 443 should show LISTEN on 0.0.0.0 or [::].

---

## SLICE 2: BIND DATABASES TO LOCALHOST

Defense in depth — even with the firewall, databases should only listen on 127.0.0.1.
These may or may not be installed. Check first, fix if present, skip if absent.

**MySQL:**
```bash
# Check if MySQL is installed and running
systemctl status mysql 2>/dev/null || systemctl status mariadb 2>/dev/null

# If running, check bind address
grep -r "bind-address" /etc/mysql/ 2>/dev/null

# Fix if needed — set to 127.0.0.1
# Only run this if MySQL is actually installed:
sed -i 's/bind-address\s*=.*/bind-address = 127.0.0.1/' /etc/mysql/mysql.conf.d/mysqld.cnf 2>/dev/null
systemctl restart mysql 2>/dev/null
```

**PostgreSQL:**
```bash
# Check if PostgreSQL is installed and running
systemctl status postgresql 2>/dev/null

# If running, check listen_addresses
grep -r "listen_addresses" /etc/postgresql/ 2>/dev/null

# Fix if needed — set to localhost
# Only run this if PostgreSQL is actually installed:
find /etc/postgresql/ -name postgresql.conf -exec sed -i "s/listen_addresses = '\*'/listen_addresses = 'localhost'/" {} \; 2>/dev/null
find /etc/postgresql/ -name postgresql.conf -exec sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" {} \; 2>/dev/null
systemctl restart postgresql 2>/dev/null
```

If neither is installed, report "No databases found — slice N/A" and move on.

---

## SLICE 3: HARDEN SSH

The deploy user's credentials were exposed in a public git repo (deploy.json contained IP, user, port, path). Harden SSH access.

```bash
# 1. Check current SSH config
grep -E "PasswordAuthentication|PermitRootLogin|PubkeyAuthentication" /etc/ssh/sshd_config

# 2. Disable password authentication (force key-only)
sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# 3. Ensure pubkey auth is enabled
sed -i 's/^#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config

# 4. Validate config before restarting
sshd -t

# 5. Only restart if validation passed
sshd -t && systemctl restart sshd

# 6. Verify
grep -E "PasswordAuthentication|PubkeyAuthentication" /etc/ssh/sshd_config
```

IMPORTANT: Do NOT disable root login or change SSH port — Djordje needs root access to continue working. Only disable password auth.

After disabling password auth, change the deploy user's password to something random (since password login is now disabled, this is just belt-and-suspenders):
```bash
# Generate random password and set it
echo "deploy:$(openssl rand -base64 32)" | chpasswd
```

---

## SLICE 4: NGINX SECURITY HEADERS

The nginx config on the server needs security headers added to all server blocks.
The updated config is already in the git repo (hivemind.nginx.conf), but apply directly on the server too.

```bash
# Find the active nginx config for the bowling site
ls -la /etc/nginx/sites-enabled/
cat /etc/nginx/sites-enabled/hivemind* 2>/dev/null || cat /etc/nginx/conf.d/hivemind* 2>/dev/null

# The config should be at one of:
# /etc/nginx/sites-available/hivemind.nginx.conf (symlinked to sites-enabled)
# /etc/nginx/conf.d/hivemind.nginx.conf
```

For EACH `server` block in the active nginx config, add these headers (if not already present):
```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
server_tokens off;
```

Also ensure the port 80 block for bowling-challenge.hivemind.rs redirects to HTTPS:
```nginx
server {
    listen 80;
    server_name bowling-challenge.hivemind.rs;
    location / {
        return 301 https://$host$request_uri;
    }
}
```

After editing:
```bash
nginx -t && systemctl reload nginx
```

---

## SLICE 5: DEPLOY APP-LEVEL FIXES

The security fixes (XSS, rate limiting, input validation, UUIDs, security headers) are already pushed to `origin/master`. Pull and rebuild:

```bash
cd /home/deploy/bowling-alley-challenge

# Pull latest (as deploy user or fix ownership after)
git pull origin master

# Rebuild and restart Docker container
docker compose down
docker compose up --build -d

# Verify container is running
docker compose ps
docker compose logs --tail=20
```

**Verify the app is responding:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3150/
# Should return 200

curl -s http://localhost:3150/ | head -5
# Should return HTML

# Check security headers via nginx
curl -sI https://bowling-challenge.hivemind.rs/ | grep -iE "x-frame|x-content|referrer|strict-transport|x-powered"
# Should show headers, should NOT show x-powered-by
```

---

## SLICE 6: VERIFY SSL

```bash
# Check cert expiry
echo | openssl s_client -servername bowling-challenge.hivemind.rs -connect 127.0.0.1:443 2>/dev/null | openssl x509 -noout -dates

# Check certbot auto-renewal
certbot renew --dry-run 2>/dev/null

# If certbot isn't managing this (Cloudflare handles SSL), that's fine — just report
```

---

## SLICE 7: VERIFY AND REPORT

Run this final verification checklist:

```bash
echo "=== FIREWALL ==="
ufw status | head -20

echo "=== LISTENING PORTS (external) ==="
ss -tlnp | grep -v "127.0.0.1\|::1"

echo "=== SSH CONFIG ==="
grep PasswordAuthentication /etc/ssh/sshd_config | grep -v "^#"

echo "=== NGINX HEADERS ==="
curl -sI https://bowling-challenge.hivemind.rs/ 2>/dev/null | grep -iE "x-frame|x-content|referrer|strict-transport|permissions-policy|x-powered|server:"

echo "=== APP STATUS ==="
docker compose -f /home/deploy/bowling-alley-challenge/docker-compose.yml ps

echo "=== APP RESPONSE ==="
curl -s -o /dev/null -w "HTTP %{http_code}" https://bowling-challenge.hivemind.rs/
```

Report results for each slice as DONE / SKIPPED (with reason) / FAILED (with error).

---

## WHAT NOT TO DO

- Don't disable root SSH login — Djordje needs it for now
- Don't change the SSH port
- Don't modify any application source code — that's already done
- Don't touch Docker networking beyond the existing port mapping
- Don't disable or remove the /meta endpoints or trace output — they power the teaching UI
- Don't add authentication to the bowling API — it's a public demo
- Don't touch any other projects on the server (career.hivemind.rs, methodology.hivemind.rs)
- Don't run the git history rewrite (filter-branch) — that will be done separately with Djordje's explicit approval since it requires force-push

---

## WHAT IS DELIBERATELY DEFERRED

These require Djordje's manual action and are NOT part of this prompt:

1. **Git history rewrite** — deploy.json is still in git history. Needs force-push approval. Will be done separately.
2. **Remove hivemind.nginx.conf from public repo** — also needs force-push coordination.
3. **Cloudflare DNS** — A record for bowling-challenge.hivemind.rs (Djordje handles DNS).
