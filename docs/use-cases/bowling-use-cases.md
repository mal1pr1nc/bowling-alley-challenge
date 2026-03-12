# Use Cases: Bowling Alley System

Following Dr. Cockburn's Use Case format:

## UC1: Book Game
- **Primary Actor**: Front Desk Attendant / Customer (via API)
- **Goal**: Start a new bowling game on an available lane.
- **Success Scenario**:
  1. Front Desk requests booking for 2 players.
  2. `Player Registry` records their names and shoe sizes.
  3. `Lane Manager` finds and assigns an available lane.
  4. `Scoring Engine` initializes a new game state.
  5. Front Desk receives the game confirmation.

## UC2: Record Roll
- **Primary Actor**: Bowler / Lane Sensor (via API)
- **Goal**: Register the pins knocked down in a single roll.
- **Success Scenario**:
  1. Roll information (GameID, PlayerID, Pins) is sent to Front Desk.
  2. Front Desk delegates to `Scoring Engine`.
  3. `Scoring Engine` updates the player's frames and calculates bonuses.
  4. Scoreboard reflects the updated total.

## UC3: View Scoreboard
- **Primary Actor**: Bowler / Attendant
- **Goal**: View current frames, running totals, and strike/spare markers.
- **Success Scenario**:
  1. Attendant requests scoreboard for a GameID.
  2. `Scoring Engine` returns all frames and the current score.
  3. Front Desk displays the result.

## UC4: Switch Lane (Phase 3)
- **Primary Actor**: Attendant / Manager
- **Goal**: Move a game in progress to a different lane due to mechanical failure.
- **Success Scenario**:
  1. Manager requests a lane switch for an active game.
  2. `Lane Manager` finds a new available lane.
  3. `Scoring Engine` updates the Game's `laneId`.
  4. `Lane Manager` releases the old lane and reserves the new one.
