# REDEPLOY — Bowling Alley Challenge

> One-shot. Push local changes, rebuild on VPS, verify.

---

## STEP 1: LOCAL — Commit and push

```bash
cd /c/Claude/_gemini\ _hivemind/bowling_alley_challenge

git add -A
git status

git commit -m "fix: UI bugs, integration tests, strike validation guard

- Player names display correctly (was showing 'P' from ID prefix)
- Scoreboard shows running totals instead of per-frame scores
- 10th frame strike/spare rendering fixed
- Strike in frames 1-9 renders in top-right slot per bowling convention
- Hex monitor shows all 10 lanes, per-player frame progress
- Added 19 integration tests (player-registry, lane-manager, front-desk)
- Fixed recordRoll rejecting valid strikes after strikes in frames 1-9
- Added build/start/dev scripts to package.json
- Removed dead code in refreshScoreboard

Co-Authored-By: Claude Code <noreply@anthropic.com>"

git push origin master
```

---

## STEP 2: VPS — Pull and rebuild

```bash
ssh root@46.225.109.178

cd /home/deploy/bowling-alley-challenge
git pull origin master

docker compose down
docker compose up --build -d

# Wait for container to stabilize
sleep 5
docker compose ps
docker compose logs --tail=30
```

---

## STEP 3: VERIFY

```bash
# App responds
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3150/

# API status
curl -s http://localhost:3150/api/status

# Book a game
curl -s -X POST http://localhost:3150/games \
  -H "Content-Type: application/json" \
  -d '{"playerNames": ["Alice", "Bob"]}'

# Meta endpoints (teaching UI data source)
curl -s http://localhost:3150/meta/business-rules | head -3
curl -s http://localhost:3150/meta/use-cases | head -3

# External check (through nginx)
curl -sI https://bowling-challenge.hivemind.rs/ | grep -E "HTTP|x-frame|x-content"
```

Expected:
- HTTP 200 on all GETs
- Game booking returns JSON with `value.id`, `value.laneId`, `value.playerIds`
- Security headers present on external URL
- No `x-powered-by` header

---

## STEP 4: SMOKE TEST THE UI

Open https://bowling-challenge.hivemind.rs/ in browser. Verify:

1. Click NEW GAME, enter "Alice, Bob", click BOOT SYSTEM
2. Scoreboard shows "ALICE" and "BOB" (not "P")
3. Select 10 pins, click ROLL — strike appears as X in top-right slot
4. Running totals accumulate correctly
5. Hex Monitor tab shows all 10 lanes with colored status dots
6. Scoring Engine panel shows per-player frame count
7. Business Rules tab loads rules from /meta/business-rules
8. Use Cases tab renders Cockburn format

---

## IF SOMETHING BREAKS

```bash
# Check container logs
docker compose logs --tail=100

# Rebuild from scratch
docker compose down
docker compose build --no-cache
docker compose up -d

# Nuclear option — restart Docker daemon
systemctl restart docker
cd /home/deploy/bowling-alley-challenge
docker compose up -d
```

---

## DONE

Report: deployed / verified / failed (with error).
