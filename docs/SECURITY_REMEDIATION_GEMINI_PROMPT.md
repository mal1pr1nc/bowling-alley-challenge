# SECURITY REMEDIATION — Server-Side (Gemini CLI)

> PRIORITY: CRITICAL. Execute before any LinkedIn publication.
> Claude Code has already fixed the app-level issues (XSS, rate limiting, input validation, UUIDs, x-powered-by, deploy.json removal).
> This prompt covers SERVER-SIDE fixes that require SSH access to 46.225.109.178.

---

## SLICE 1: FIREWALL (CRITICAL — do this FIRST)

SSH to the VPS and lock down ports. Only 80, 443, and SSH should be reachable externally.

```bash
ssh deploy@46.225.109.178

# Enable UFW and set default deny
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow only what's needed
sudo ufw allow 80/tcp    # HTTP (Nginx)
sudo ufw allow 443/tcp   # HTTPS (Nginx)
sudo ufw allow 22/tcp    # SSH (restrict to specific IP if known)

# Enable
sudo ufw enable
sudo ufw status verbose
```

This closes: FTP (21), Node dev (3000), MySQL (3306), PostgreSQL (5432), 8080, 8443, 9090.

Verify after:
```bash
# From a different machine or using curl:
# These should all timeout/refuse now:
curl -s --connect-timeout 3 http://46.225.109.178:3306 || echo "3306 blocked"
curl -s --connect-timeout 3 http://46.225.109.178:5432 || echo "5432 blocked"
curl -s --connect-timeout 3 http://46.225.109.178:9090 || echo "9090 blocked"
```

---

## SLICE 2: BIND DATABASES TO LOCALHOST (CRITICAL)

Even with the firewall, bind databases to 127.0.0.1 as defense in depth.

**MySQL:**
```bash
# Find MySQL config
sudo grep -r "bind-address" /etc/mysql/
# Set to 127.0.0.1:
sudo sed -i 's/bind-address\s*=.*/bind-address = 127.0.0.1/' /etc/mysql/mysql.conf.d/mysqld.cnf
sudo systemctl restart mysql
```

**PostgreSQL:**
```bash
# Find PostgreSQL config
sudo grep -r "listen_addresses" /etc/postgresql/
# Set to localhost:
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf
sudo sed -i "s/listen_addresses = '\*'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf
sudo systemctl restart postgresql
```

---

## SLICE 3: ROTATE DEPLOY CREDENTIALS (CRITICAL)

The deploy user's SSH setup was exposed in the public repo. Rotate:

```bash
# On the VPS, as root or sudo user:
# 1. Change deploy user password
sudo passwd deploy

# 2. Regenerate SSH keys if password auth was ever used
# On your LOCAL machine, generate new key:
ssh-keygen -t ed25519 -C "deploy-bowling" -f ~/.ssh/deploy_bowling

# Copy to server:
ssh-copy-id -i ~/.ssh/deploy_bowling.pub deploy@46.225.109.178

# 3. Disable password auth for SSH (key-only)
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

---

## SLICE 4: NGINX SECURITY HEADERS (MEDIUM)

Add security headers to hivemind.nginx.conf. The report noted these exist in nginx.conf.remote but not in the production config.

Add to each `server` block (or create a shared snippet):

```nginx
# In each server block, inside location / { }:
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Hide nginx version
server_tokens off;
```

Apply to ALL server blocks in hivemind.nginx.conf, then:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## SLICE 5: GIT HISTORY REWRITE (CRITICAL)

deploy.json has been removed from the working tree and .gitignore, but it's still in git history. Purge it:

```bash
cd /path/to/bowling_alley_challenge

# Remove from all history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch deploy.json' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (this rewrites history — coordinate with Djordje)
git push origin --force --all

# Clean up
git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

IMPORTANT: This force-pushes. Djordje must approve. All other clones will need to re-clone.

Also remove hivemind.nginx.conf from the public repo (it reveals internal infrastructure):
```bash
git rm hivemind.nginx.conf
echo "hivemind.nginx.conf" >> .gitignore
git commit -m "Remove nginx config from public repo (security)"
```

---

## SLICE 6: DEPLOY THE APP-LEVEL FIXES

Claude Code has already made these changes locally:
- deploy.json deleted, added to .gitignore
- XSS fixed (textContent instead of innerHTML, escapeHtml helper)
- x-powered-by disabled
- Rate limiting added (30 req/min per IP, no npm dependency)
- Input validation (player names: alphanumeric 1-50 chars, max 4 players; pins: integer 0-10)
- Body size limit (16kb)
- Security headers in Express middleware
- UUIDs for all entity IDs (crypto.randomUUID)
- Source file paths removed from /meta/business-rules responses

Push and deploy:
```bash
# Push the local changes first
git add -A
git commit -m "Security hardening: XSS, rate limiting, input validation, UUIDs, headers"
git push origin master

# SSH and redeploy
ssh deploy@46.225.109.178
cd /home/deploy/bowling-alley-challenge
git pull origin master
docker compose up --build -d
```

---

## SLICE 7: VERIFY SSL CERT AUTO-RENEWAL (MEDIUM)

The cert expires April 20, 2026. Verify Certbot is set up:

```bash
sudo certbot renew --dry-run
```

If it fails, the Cloudflare proxy is handling SSL (Flexible mode), so this may not apply. But verify.

---

## WHAT NOT TO DO

- Don't disable the trace output or /meta endpoints entirely — they're the Engine Room's data source for the teaching UI. The Express-level security headers and rate limiting are sufficient for a demo app.
- Don't change any hexagonal boundaries.
- Don't touch rhi-42/.
- Don't add authentication to the bowling API — it's a public demo.
