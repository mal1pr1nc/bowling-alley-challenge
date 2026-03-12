# Bowling Alley Challenge — Interactive Teaching UI

> This is a prompt for Gemini CLI. It contains the full spec for building the frontend.
> Source: Claude Code audit + Djordje's design research + Alistair Cockburn's feedback.

---

## WHAT THIS IS

A public-facing demo of Dr. Alistair Cockburn's Bowling Alley Challenge, built with AI using hexagonal architecture. The UI is a teaching instrument — the bowling is the specimen, the interface is the microscope.

**Audience:** LinkedIn (engineering leaders, developers, methodology practitioners). Alistair Cockburn and JB Rainsberger will see this directly.

**Purpose:** Show how hexagonal architecture works in practice, what business rules AI designed without human oversight, and how the system flows across 4 hexagons.

---

## WHAT EXISTS (DO NOT BREAK)

- 4-hexagon TypeScript backend (Player Registry, Lane Manager, Scoring Engine, Front Desk)
- REST API on Express 5, deployed at https://bowling-challenge.hivemind.rs/
- Docker + Nginx on Hetzner VPS (46.225.109.178, user: deploy)
- Endpoints: POST /games, POST /games/:id/rolls, GET /games/:id/scoreboard
- Source: bowling_alley_challenge/
- Hexagonal boundaries are strict. Do not merge hexagons or add cross-hexagon imports.

---

## DESIGN DIRECTION: 8-BIT RETRO TERMINAL

The visual language is retro terminal meets mission control. Not a bowling alley simulation — a developer instrument that happens to run bowling.

### Colour Palette (EXACT — use these hex values)

| Role | Colour | Hex | Use |
|------|--------|-----|-----|
| Primary background | Black | #000000 | Main surfaces, dark mode base |
| Primary accent | Tangelo orange | #E53C14 | Headings, buttons, active states, CTA |
| Secondary | White | #FFFFFF | Body text on dark, highlights |
| Accent 1 | Champagne gold | #837255 | Dividers, borders, hover states |
| Accent 2 | Stone | #CDC7BB | Secondary backgrounds, code blocks |
| Retro neon | Blue neon | #4A7BD3 | Interactive highlights, API status |
| Retro green | Terminal green | #4CAF50 | Score readouts, success states, trace output |

### Typography

- **Scoreboard + Engine Room + Code:** JetBrains Mono (monospaced). Load from Google Fonts.
- **Headings:** Bold, uppercase, letter-spaced — arcade screen feel. Still JetBrains Mono but heavier weight.
- **Body copy (labels, descriptions):** Inter (geometric sans-serif) for legibility.
- **No serif fonts anywhere.**

### Iconography

- 8-bit pixel art for bowling elements: pins, ball, strike (X), spare (/).
- Keep icons on-palette (orange, white, green only).
- Align to pixel grid for crispness. CSS pixel art or inline SVG, not image files.
- No clip art. No realistic bowling imagery.

### General Principles

- Dark mode only. No light mode toggle needed.
- Grid-based layout evoking pixel grids — use champagne gold thin borders or dotted lines.
- Micro-interactions: subtle and purposeful. Frame flash on roll, hexagon pulse on activation, score slide-in. No gratuitous animation.
- Text-first interface. The engine room is the star, not graphics.
- No bowling lane animation. No ball rolling. The visual interest is the architecture, not the sport.

---

## LAYOUT: TWO-PANEL SPLIT

### Top: THE GAME (~35% of viewport height)

**Header bar:**
```
BOWLING ALLEY CHALLENGE
Hexagonal Architecture in Practice
Proposed by Alistair Cockburn & JB Rainsberger | Built by Djordje Nikolic + AI Hive Mind
```
- "Alistair Cockburn" links to https://www.linkedin.com/in/alistair-cockburn/ (new tab)
- "JB Rainsberger" links to https://www.linkedin.com/in/jbrains/ (new tab)
- "Djordje Nikolic" links to https://www.linkedin.com/in/djordjenikolic/ (new tab)
- Header text in tangelo orange, names in white with gold underline on hover.

**Game controls (left side):**
- "NEW GAME" button (tangelo orange border, blue neon on hover)
- Player name input (1-4 players)
- Active player indicator
- Pin selector: 0-10 clickable buttons (pixel-styled) + "ROLL" button
- Turn order is NOT enforced. Show a subtle label: "Demo mode — turn order relaxed"

**Scoreboard (right side, or full width below controls):**
- Classic bowling scoreboard grid: 10 frames, 2 roll slots per frame (3 for 10th), running total
- Retro style: tangelo orange outlines on pixel-lined boxes
- Strike = "X" in orange, Spare = "/" in blue neon
- Running totals in terminal green
- Incomplete frames show dashes
- Multiple players stacked vertically

### Bottom: THE ENGINE ROOM (~65% of viewport height)

This is the differentiator. A tabbed panel system styled like developer tools or a terminal multiplexer.

**Tab bar** (styled like terminal tabs — blocky, orange borders, blue neon active state):

#### Tab 1: HEXAGON MONITOR (default tab)

Four sub-panels arranged in a 2x2 grid, one per hexagon:

```
+------------------------+------------------------+
|   PLAYER REGISTRY      |   LANE MANAGER         |
|   [state + trace]      |   [state + trace]      |
+------------------------+------------------------+
|   SCORING ENGINE       |   FRONT DESK           |
|   [state + trace]      |   [state + trace]      |
+------------------------+------------------------+
```

Each sub-panel shows:
- **Hexagon name** in orange, uppercase
- **Current state:**
  - Player Registry: list of registered players (name, ID)
  - Lane Manager: lane status grid (10 lanes, colour-coded: green=available, orange=in-use, red=maintenance)
  - Scoring Engine: raw roll arrays per player, frame calculation state
  - Front Desk: current game ID, active orchestration status
- **Activity trace** (terminal green text, monospaced, scrolling):
  ```
  [PORT] registerPlayer("Alice", 10)
  [ADAPTER] InMemoryPlayerStorage.save({id: "p-...", name: "Alice"})
  [RESULT] Success → Player registered
  ```

When a user action triggers a flow, highlight each hexagon's panel in sequence with a brief pulse/glow effect (champagne gold border flash) to show the orchestration order.

#### Tab 2: BUSINESS RULES

Shows all business rules the system enforces (and flags the ones it DOESN'T).

Format each rule as a card/row:

```
STRIKE RULE                                    [ENFORCED]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Condition:  First roll in frame = 10
Score:      10 + next two rolls
Source:     scoring-engine/domain/scoring.ts:20
Status:     ● Active (when current roll is a strike)
```

```
PIN VALIDATION                                 [NOT ENFORCED]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Condition:  Roll pins must be 0-10; roll2 <= (10 - roll1)
Expected:   Reject invalid pin counts
Actual:     System accepts any number without validation
Gap:        AI-designed system trusts all input
Note:       This is a known drift from real bowling rules
```

Rules to document:
- Strike rule (ENFORCED)
- Spare rule (ENFORCED)
- Open frame rule (ENFORCED)
- 10th frame bonus rolls (ENFORCED)
- Pin count validation (NOT ENFORCED — accepts any number)
- Turn order (NOT ENFORCED — any player can roll anytime)
- Frame boundary (NOT ENFORCED — API doesn't track whose turn it is)
- Lane capacity (ENFORCED — one game per lane)
- Game completion detection (ENFORCED — checks all players' frames)
- Player registration rollback on booking failure (NOT ENFORCED — players persist even if lane assignment fails)

Highlight ENFORCED rules in terminal green, NOT ENFORCED in tangelo orange.

When a rule activates during gameplay, pulse its card and scroll it into view.

#### Tab 3: USE CASES (Cockburn Format)

Display the use cases in proper Alistair Cockburn format. This is critical — Alistair will check this.

**Summary-level use case (show first):**

```
UC0: RUN A BOWLING SESSION                          [SUMMARY LEVEL]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scope:             Bowling Alley System (all 4 hexagons)
Level:             Summary (cloud)
Primary Actor:     Front Desk Attendant

Main Success Scenario:
  1. Attendant submits player names for a new game
  2. Player Registry creates a record per player
     [AI decision: shoe size hardcoded to 10]
     [AI decision: IDs are timestamp + random string]
  3. Lane Manager finds first available lane, marks it in-use
     [AI decision: sequential scan, no preference logic]
  4. Scoring Engine initializes game with empty roll arrays
  5. Bowler rolls — Attendant records pin count
     [AI gap: no pin validation — accepts any number]
     [AI gap: no turn order enforcement]
  6. Scoring Engine calculates frames (strike/spare/open)
     [Correct: standard bowling math verified]
  7. Attendant views scoreboard at any time
  8. Game auto-completes when all players finish 10 frames

Extensions:
  3a. No lanes available → booking fails
      [AI gap: already-registered players not rolled back]
  5a. Lane breaks → Attendant switches lane
      [AI correct: score state preserved across switch]

Business Rules Designed by AI Without Human Specification:
  • Player identity scheme (timestamp-based)
  • Shoe size as required field, hardcoded by orchestrator
  • Lane assignment strategy (first-available sequential)
  • No input validation at domain boundary
  • Result<T,E> monad error model (no exceptions)
  • In-memory persistence (dies with restart)
```

Then show UC1-UC4 in full Cockburn form:

```
UC1: BOOK GAME                                       [USER GOAL LEVEL]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary Actor:     Front Desk Attendant
Goal in Context:   Start a new bowling game for a group of players
Scope:             Front Desk hexagon (orchestrates 3 others)
Level:             User Goal (sea level)
Preconditions:     At least one lane is available
                   1-4 player names provided
Success Guarantee: Game created, lane reserved, all players registered

Main Success Scenario:
  1. Attendant submits player names via POST /games
  2. Front Desk calls Player Registry for each name
  3. Player Registry creates player record, returns ID
  4. Front Desk calls Lane Manager to assign a lane
  5. Lane Manager finds first available lane, marks in-use
  6. Front Desk calls Scoring Engine to initialize game
  7. Scoring Engine creates game state with player IDs and lane
  8. Front Desk returns game confirmation (game ID, lane, player IDs)

Extensions:
  2a. Player registration fails → return error, no lane assigned
  4a. No lanes available → return error, players remain registered
```

```
UC2: RECORD ROLL                                     [USER GOAL LEVEL]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary Actor:     Bowler / Lane Sensor
Goal in Context:   Register pins knocked down in a single roll
Scope:             Front Desk → Scoring Engine
Level:             User Goal
Preconditions:     Game exists and is not complete
                   Player is part of the game
Success Guarantee: Roll recorded, frames recalculated,
                   game completion checked

Main Success Scenario:
  1. Roll data (game ID, player ID, pin count) sent to Front Desk
  2. Front Desk delegates to Scoring Engine
  3. Scoring Engine appends pin count to player's roll array
  4. Scoring Engine recalculates all frames for that player
  5. Scoring Engine checks if ALL players have completed 10 frames
  6. If yes, marks game as complete

Extensions:
  [NONE IMPLEMENTED — no validation, no turn enforcement]
```

```
UC3: VIEW SCOREBOARD                                 [USER GOAL LEVEL]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary Actor:     Bowler / Attendant
Goal in Context:   View current frames, running totals, marks
Scope:             Front Desk → Scoring Engine
Level:             User Goal
Preconditions:     Game exists
Success Guarantee: Accurate scoreboard returned

Main Success Scenario:
  1. Attendant requests scoreboard for a game ID
  2. Front Desk delegates to Scoring Engine
  3. Scoring Engine calculates frames for each player from roll arrays
  4. Returns: per-player frames (rolls, score) + total score
```

```
UC4: SWITCH LANE                                     [USER GOAL LEVEL]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary Actor:     Attendant / Manager
Goal in Context:   Move active game to a different lane (mechanical failure)
Scope:             Front Desk → Lane Manager + Scoring Engine
Level:             User Goal
Preconditions:     Game exists, another lane is available
Success Guarantee: Game moved, old lane released, scores preserved

Main Success Scenario:
  1. Manager requests lane switch for active game
  2. Front Desk gets current game to find old lane ID
  3. Front Desk asks Lane Manager for a new available lane
  4. Lane Manager assigns new lane
  5. Front Desk tells Scoring Engine to update game's lane ID
  6. Front Desk tells Lane Manager to release old lane
  7. Game continues on new lane with all scores intact

Extensions:
  3a. No other lanes available → return error, game stays on current lane
```

Highlight the currently active use case step during gameplay. When the user clicks "New Game", highlight UC1 and step through 1→2→3→4→5→6→7→8 in sync with the hexagon monitor.

#### Tab 4: ARCHITECTURE

- Static hex diagram showing the 4 hexagons, their ports (driving + driven), adapters, and bridges
- Can be SVG or CSS-drawn. Style it with the retro palette.
- Show the composition root (main.ts) as the wiring point
- Highlight active hexagon during operations
- Collapsible ADR list (show ADR 001-004 content inline)
- Link to source files (display path, not clickable — this is a teaching view)

---

## BACKEND CHANGES REQUIRED

### 1. Serve Static Files

Add to the Express app in `main.ts` or `http-adapter.ts`:
```typescript
import path from 'path';
// Before route setup:
this.app.use(express.static(path.join(__dirname, '../../public')));
```

Create `bowling_alley_challenge/public/` for the frontend files.

### 2. Add Trace Endpoint

The engine room needs REAL trace data. Create a tracer that captures execution events.

```typescript
// src/shared/tracer.ts
export interface TraceEvent {
  timestamp: number;
  hexagon: 'front-desk' | 'player-registry' | 'lane-manager' | 'scoring-engine';
  layer: 'port' | 'adapter' | 'domain' | 'bridge';
  action: string;
  input?: any;
  output?: any;
  businessRule?: string; // which rule applied, if any
}

export class Tracer {
  private events: TraceEvent[] = [];

  trace(event: Omit<TraceEvent, 'timestamp'>): void {
    this.events.push({ ...event, timestamp: Date.now() });
  }

  flush(): TraceEvent[] {
    const events = [...this.events];
    this.events = [];
    return events;
  }
}
```

Pass tracer through constructors. Each service method logs trace events. Include trace data in API responses:

```json
{
  "result": { "..." },
  "trace": [
    { "hexagon": "front-desk", "layer": "port", "action": "bookGame", "..." : "..." },
    { "hexagon": "player-registry", "layer": "adapter", "action": "save", "..." : "..." }
  ]
}
```

The tracer is INJECTED, not hardwired. It doesn't change any hexagonal boundaries.

### 3. Business Rules Metadata Endpoint

Add `GET /meta/business-rules` that returns the rules list as JSON (enforced status, source file, description). The frontend reads this once on load.

Add `GET /meta/use-cases` that returns the use case text as JSON. Or embed both in the HTML as inline data.

---

## TECH CONSTRAINTS

- Frontend: Single `index.html` in `public/` with embedded CSS and JS. No build step. No React, no bundler. Vanilla JS + CSS.
- Load JetBrains Mono and Inter from Google Fonts CDN.
- The frontend calls the existing REST API via fetch(). No WebSockets for v1.
- Must work in the existing Docker container — just add the public/ directory.
- Total frontend should be under 50KB (excluding fonts). This is a teaching tool, not a SPA.

## DEPLOYMENT

After building, push and redeploy:
```bash
# From local: push to git
git add -A && git commit -m "Add teaching UI" && git push origin master

# SSH to 46.225.109.178 as deploy
cd /home/deploy/bowling-alley-challenge
git pull origin master
docker compose up --build -d
```

Verify at https://bowling-challenge.hivemind.rs/

---

## WHAT NOT TO DO

- Don't add a database
- Don't restructure the hexagons
- Don't add authentication
- Don't add a build step or bundler
- Don't over-animate — subtle > flashy
- Don't touch rhi-42/ or anything outside bowling_alley_challenge/
- Don't add bowling lane graphics, ball animations, or skeuomorphic elements
- Don't use a CSS framework (Bootstrap, Tailwind) — hand-write the CSS to match the retro aesthetic
- Don't make it responsive for mobile on v1 — desktop-first for LinkedIn demos
