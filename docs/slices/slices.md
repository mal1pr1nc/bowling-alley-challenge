# Walking Skeleton Slices: Bowling Alley

## Slice 1: Register Player
- **Scope**: `Player Registry` hexagon.
- **Goal**: Can we save and retrieve a player?
- **Ports**: `registerPlayer`, `getPlayer`.
- **Validation**: `Phase 1` successful implementation.

## Slice 2: Assign Lane
- **Scope**: `Lane Manager` hexagon.
- **Goal**: Can we find and change a lane status?
- **Ports**: `assignLane`, `releaseLane`.
- **Validation**: `Phase 1` and `Phase 3` successful implementation.

## Slice 3: Basic Game Start (Alice & Bob)
- **Scope**: `Front Desk` + Bridges + `Player Registry` + `Lane Manager`.
- **Goal**: Can we wire 3 hexagons to initiate a game?
- **Ports**: `bookGame`.
- **Validation**: `main.ts` (Phase 1) initialization.

## Slice 4: Score Recording (Strikes/Spares)
- **Scope**: `Scoring Engine` hexagon.
- **Goal**: Can we calculate complex bowling scores?
- **Ports**: `recordRoll`, `getScoreboard`.
- **Validation**: `test-scoring.ts` (Phase 2) 300 points test.

## Slice 5: HTTP Driving Adapter
- **Scope**: `Front Desk` HTTP Adapter.
- **Goal**: Can we drive the system via REST instead of console?
- **Ports**: `POST /games`, `POST /rolls`.
- **Validation**: `test-api.ts` (Phase 4) successful execution.
