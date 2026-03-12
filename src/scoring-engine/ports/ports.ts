import { Game, GameId, PlayerId, Result } from '../../shared/types';

export interface Scoreboard {
  gameId: GameId;
  playerScores: {
    playerId: string;
    totalScore: number;
    frames: { rolls: number[]; score: number }[];
  }[];
}

export interface ScoringEngineDrivingPort {
  startGame(laneId: string, playerIds: PlayerId[]): Promise<Result<Game>>;
  recordRoll(gameId: GameId, playerId: PlayerId, pins: number): Promise<Result<void>>;
  getScoreboard(gameId: GameId): Promise<Result<Scoreboard>>;
  changeLane(gameId: GameId, newLaneId: string): Promise<Result<void>>;
  getGame(gameId: GameId): Promise<Result<Game>>;
}

export interface GameStorageDrivenPort {
  save(game: Game, rolls: Map<PlayerId, number[]>): Promise<void>;
  findById(id: GameId): Promise<{ game: Game; rolls: Map<PlayerId, number[]> } | null>;
}
