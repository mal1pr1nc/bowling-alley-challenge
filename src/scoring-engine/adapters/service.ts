import { Game, GameId, PlayerId, Result, success, failure } from '../../shared/types';
import { ScoringEngineDrivingPort, GameStorageDrivenPort, Scoreboard } from '../ports/ports';
import { calculateFrames } from '../domain/scoring';

export class ScoringEngineService implements ScoringEngineDrivingPort {
  constructor(private storage: GameStorageDrivenPort) {}

  async startGame(laneId: string, playerIds: PlayerId[]): Promise<Result<Game>> {
    const game: Game = {
      id: `g-${Date.now()}`,
      laneId,
      playerIds,
      isComplete: false,
    };
    const rolls = new Map<PlayerId, number[]>();
    playerIds.forEach(pid => rolls.set(pid, []));
    
    await this.storage.save(game, rolls);
    return success(game);
  }

  async recordRoll(gameId: GameId, playerId: PlayerId, pins: number): Promise<Result<void>> {
    const data = await this.storage.findById(gameId);
    if (!data) return failure(new Error('Game not found'));
    
    const playerRolls = data.rolls.get(playerId);
    if (!playerRolls) return failure(new Error('Player not in game'));
    
    playerRolls.push(pins);
    
    const frames = calculateFrames(playerRolls);
    const gameIsComplete = data.game.playerIds.every(pid => {
      const pRolls = pid === playerId ? playerRolls : data.rolls.get(pid) || [];
      const pFrames = calculateFrames(pRolls);
      return pFrames.length === 10 && pFrames[9]?.isComplete;
    });

    data.game.isComplete = gameIsComplete;

    await this.storage.save(data.game, data.rolls);
    return success(undefined);
  }

  async getScoreboard(gameId: GameId): Promise<Result<Scoreboard>> {
    const data = await this.storage.findById(gameId);
    if (!data) return failure(new Error('Game not found'));

    const playerScores = data.game.playerIds.map(pid => {
      const rolls = data.rolls.get(pid) || [];
      const frames = calculateFrames(rolls);
      const totalScore = frames.length > 0 ? (frames[frames.length - 1]?.runningTotal ?? 0) : 0;
      
      return {
        playerId: pid,
        totalScore,
        frames: frames.map(f => ({ rolls: f.rolls, score: f.score }))
      };
    });

    return success({ gameId, playerScores });
  }

  async changeLane(gameId: GameId, newLaneId: string): Promise<Result<void>> {
    const data = await this.storage.findById(gameId);
    if (!data) return failure(new Error('Game not found'));

    data.game.laneId = newLaneId;
    await this.storage.save(data.game, data.rolls);
    return success(undefined);
  }

  async getGame(gameId: GameId): Promise<Result<Game>> {
    const data = await this.storage.findById(gameId);
    return data ? success(data.game) : failure(new Error('Game not found'));
  }
}
