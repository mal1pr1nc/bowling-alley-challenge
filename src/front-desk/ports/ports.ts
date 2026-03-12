import { PlayerId, LaneId, GameId, Game, Result } from '../../shared/types';
import { Scoreboard } from '../../scoring-engine/ports/ports';

export interface FrontDeskDrivingPort {
  bookGame(playerNames: string[]): Promise<Result<Game>>;
  recordRoll(gameId: GameId, playerId: PlayerId, pins: number): Promise<Result<void>>;
  getScoreboard(gameId: GameId): Promise<Result<Scoreboard>>;
  switchLane(gameId: GameId): Promise<Result<void>>;
  setLaneMaintenance(laneId: LaneId, isMaintenance: boolean): Promise<Result<void>>;
}

// Driven ports for other hexagons - SHAPED like them but independent
export interface PlayerRegistryPort {
  registerPlayer(name: string, shoeSize: number): Promise<Result<{ id: string }>>;
}

export interface LaneManagerPort {
  assignLane(): Promise<Result<{ id: string }>>;
  assignSpecificLane(id: string): Promise<Result<{ id: string }>>;
  releaseLane(id: string): Promise<Result<void>>;
  setMaintenance(id: string, isMaintenance: boolean): Promise<Result<void>>;
}

export interface ScoringEnginePort {
  startGame(laneId: string, playerIds: string[]): Promise<Result<Game>>;
  recordRoll(gameId: string, playerId: string, pins: number): Promise<Result<void>>;
  getScoreboard(gameId: string): Promise<Result<Scoreboard>>;
  changeLane(gameId: string, newLaneId: string): Promise<Result<void>>;
  getGame(gameId: string): Promise<Result<Game>>;
}
