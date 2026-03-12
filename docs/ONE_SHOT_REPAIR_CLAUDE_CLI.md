# ONE-SHOT REPAIR — Claude CLI

> Boot from `bowling_alley_challenge/`. Execute all slices. Commit when done.
> Estimated scope: ~8 targeted fixes across frontend + backend + tests. No architectural changes.

---

## CONTEXT

This is a 4-hexagon TypeScript bowling system (Hexagonal Architecture). It compiles cleanly (`npx tsc --noEmit` passes), has 5/5 vitest tests passing, and is deployed at https://bowling-challenge.hivemind.rs/.

The UI exists at `public/index.html` — a vanilla JS teaching interface with a game panel (top 35%) and engine room (bottom 65%). The backend serves it via Express static files.

Your job: fix the bugs, fill the test gaps, clean up dead code. No new features. No architectural changes. No hexagonal boundary changes.

---

## SLICE 1: FIX PLAYER NAME DISPLAY (BUG — visible to users)

**Problem:** The frontend extracts player names from `playerId.split('-')[0]`, but player IDs are formatted as `p-<uuid>`. This displays "P" for every player instead of their actual name.

**Files:** `public/index.html` (lines ~618, ~631), `src/front-desk/adapters/http-adapter.ts`

**Fix:** Two options (pick the cleaner one):
- **Option A (preferred):** Store the player name mapping client-side when the game is booked. The `POST /games` response already returns `playerIds`. Modify `startGame()` to also capture player names from the input and store a `playerNameMap = { playerId: "Alice", ... }`. Use that map in `refreshScoreboard()`.
- **Option B:** Add player names to the scoreboard API response. This requires changes in the scoring engine's getScoreboard → would need to pass names through. Heavier change — avoid if Option A works.

**Verify:** Start a game for "Alice, Bob". The scoreboard should show "ALICE" and "BOB", not "P" and "P".

---

## SLICE 2: FIX SCORE DISPLAY (BUG — incorrect bowling scores shown)

**Problem:** In `refreshScoreboard()`, the scoreboard cells show `f.score` which is the individual frame score. A proper bowling scoreboard shows the **running total** per frame.

**File:** `public/index.html` (line ~613)

**Fix:** Change `f.score || '-'` to `f.runningTotal || '-'` in the total-slot div.

**Verify:** Play a few frames. Frame totals should accumulate (e.g., spare in frame 1 followed by 5 pins → frame 1 shows 15, frame 2 shows 20). Not just individual frame scores.

---

## SLICE 3: REMOVE DEAD CODE

**Problem:** In `refreshScoreboard()` (line ~634), there's an unused fetch to `/api/status` with a comment "Not enough, we need game info". Dead code.

**File:** `public/index.html`

**Fix:** Remove lines 634-636 (the `statusRes` fetch, comment, and blank line). The `updateHexagonStates()` call should remain.

---

## SLICE 4: ADD BUILD SCRIPT TO package.json

**Problem:** No `build` script. The `main` field points to `index.js` which doesn't exist.

**File:** `package.json`

**Fix:**
```json
"main": "dist/main.js",
"scripts": {
  "build": "tsc",
  "start": "node dist/main.js",
  "dev": "ts-node src/main.ts",
  "test": "vitest run"
}
```

**Verify:** `npm run build` compiles to `dist/`. `npm start` boots the server.

---

## SLICE 5: CONVERT MANUAL TESTS TO VITEST (biggest slice)

**Problem:** Three manual test scripts exist (`src/test-api.ts`, `src/test-lanes.ts`, `src/test-scoring.ts`) that test via direct service instantiation or HTTP. These should be proper vitest integration tests so `npm test` covers more than just the scoring domain.

**Create these test files:**

### 5a: `src/player-registry/__tests__/player-registry.test.ts`
Test the player registry service directly:
- Register a player → returns success with ID and name
- Get a player by ID → returns the player
- List all players → returns registered players
- Get non-existent player → returns failure

### 5b: `src/lane-manager/__tests__/lane-manager.test.ts`
Test the lane manager service directly:
- Assign lane → returns first available lane, marks in-use
- Release lane → lane becomes available again
- Set maintenance → lane status changes
- Assign when none available → returns failure
- Assign specific lane → works when available, fails when occupied

### 5c: `src/front-desk/__tests__/front-desk.test.ts`
Test the full orchestration (wire all 4 hexagons in-memory, no HTTP):
- Book game → creates players, assigns lane, starts game
- Book game with no lanes → fails
- Record roll → updates scoreboard
- Switch lane → score preserved, old lane released
- Perfect game → score reaches 300

**Pattern to follow:** Look at the existing `src/scoring-engine/domain/__tests__/scoring.test.ts` for test style. Use `describe`/`it` blocks. Import directly from service files, wire with in-memory storage adapters. No HTTP server needed — test the domain/service layer.

**Important:** These are new test files only. Do NOT modify the existing manual test scripts (test-api.ts etc.) — they may still be useful for manual smoke testing.

**Verify:** `npm test` passes with all new + existing tests. Target: 20+ tests total.

---

## SLICE 6: FIX 10TH FRAME SPARE DISPLAY

**Problem:** In the scoreboard rendering, the 10th frame spare detection on the 3rd roll (line ~601) checks `f.rolls[1] + f.rolls[2] === 10 && f.rolls[1] !== 10`. But if the first roll in frame 10 is a strike (10), the second roll starts fresh. A spare in frame 10 after a strike should check differently. Example: rolls [10, 7, 3] — the 3 is a spare of the 7, should show "/".

Also: In frames 1-9 (line ~589), strike detection shows X for `f.rolls[0] === 10`, but when `f.rolls[0]` is less than 10 and `f.rolls[0] + f.rolls[1] === 10`, it shows "/". This is correct. But it also needs to handle the case where `f.rolls[0] === 10` and this is NOT frame 10 — in that case there should be no second roll displayed (the X goes in the small top-right box, per bowling convention). Currently it puts X in the first slot and shows the second slot. Verify and fix if the rendering matches standard bowling scoreboard convention.

**File:** `public/index.html`

**Verify:** Bowl a perfect game (12 strikes). Frame 10 should show X X X. Bowl [10, 7, 3] in frame 10 — should show X 7 /.

---

## SLICE 7: ENRICH HEX MONITOR STATE DISPLAY

**Problem:** The Hexagon Monitor shows minimal state info. The Lane Manager just shows "Current Lane: lane-3, Status: IN-USE" — it should show ALL 10 lanes with their status.

**File:** `public/index.html` — `updateHexagonStates()` function

**Fix:** After booking a game, fetch `/api/status` (which returns lane info) OR maintain client-side state from trace events. At minimum:
- **Player Registry:** Show player names + IDs (from client-side map created in Slice 1)
- **Lane Manager:** Show all lanes with status indicators (available/in-use/maintenance). Use colored dots or text.
- **Scoring Engine:** Show current frame number per player
- **Front Desk:** Show game ID and current orchestration step

Don't over-engineer. Simple text display is fine. The trace log already provides the detailed view.

---

## WHAT NOT TO DO

- Don't restructure hexagonal boundaries
- Don't add new API endpoints (unless absolutely needed for a fix)
- Don't add npm dependencies
- Don't add authentication
- Don't touch Docker/nginx config
- Don't modify the existing scoring domain logic in `scoring-engine/domain/scoring.ts`
- Don't add a build step or bundler to the frontend
- Don't change the retro terminal aesthetic
- Don't touch anything outside `bowling_alley_challenge/`

---

## EXECUTION ORDER

1. Slice 1 (player names) — unblocks Slice 7
2. Slice 2 (running totals) — quick fix
3. Slice 3 (dead code) — quick fix
4. Slice 4 (package.json) — quick fix
5. Slice 6 (10th frame display) — medium
6. Slice 7 (hex monitor) — medium, depends on Slice 1
7. Slice 5 (tests) — biggest slice, do last

---

## VERIFICATION CHECKLIST

After all slices:

```bash
# TypeScript compiles
npx tsc --noEmit

# All tests pass (should be 20+)
npm test

# Server boots
npm run dev &
sleep 2

# API responds
curl -s http://localhost:3001/api/status | head -5

# Book a game
curl -s -X POST http://localhost:3001/games \
  -H "Content-Type: application/json" \
  -d '{"playerNames": ["Alice", "Bob"]}' | head -5

# Kill server
kill %1
```

---

## COMMIT

When all slices pass verification:

```
fix: repair UI bugs (player names, running totals, 10th frame), add integration tests

- Fix player name display (was showing "P" from player ID prefix)
- Fix scoreboard to show running totals instead of frame scores
- Fix 10th frame spare/strike rendering
- Enrich hexagon monitor state display
- Add player-registry, lane-manager, and front-desk integration tests
- Add build/start/dev scripts to package.json
- Remove dead code in refreshScoreboard
```
