import { Game, GameId, PlayerId, LaneId, Result, success, failure } from '../../shared/types';
import { Scoreboard } from '../../scoring-engine/ports/ports';
import { FrontDeskDrivingPort, PlayerRegistryPort, LaneManagerPort, ScoringEnginePort } from '../ports/ports';

export class FrontDeskService implements FrontDeskDrivingPort {
  constructor(
    private players: PlayerRegistryPort,
    private lanes: LaneManagerPort,
    private scoring: ScoringEnginePort
  ) {}

  async bookGame(playerNames: string[]): Promise<Result<Game>> {
    const playerResults = await Promise.all(playerNames.map(name => this.players.registerPlayer(name, 10)));
    const registeredPlayers = playerResults.filter(r => r.success).map(r => (r as any).value);
    
    if (registeredPlayers.length !== playerNames.length) {
      return failure(new Error('Failed to register some players'));
    }

    const laneResult = await this.lanes.assignLane();
    if (!laneResult.success) return failure(laneResult.error);

    return this.scoring.startGame(laneResult.value.id, registeredPlayers.map(p => p.id));
  }

  async recordRoll(gameId: GameId, playerId: PlayerId, pins: number): Promise<Result<void>> {
    return this.scoring.recordRoll(gameId, playerId, pins);
  }

  async getScoreboard(gameId: GameId): Promise<Result<Scoreboard>> {
    return this.scoring.getScoreboard(gameId);
  }

  async switchLane(gameId: GameId): Promise<Result<void>> {
    const gameResult = await this.scoring.getGame(gameId);
    if (!gameResult.success) return failure(gameResult.error);
    const oldLaneId = gameResult.value.laneId;

    const newLaneResult = await this.lanes.assignLane();
    if (!newLaneResult.success) return failure(new Error('No other lanes available to switch to'));

    await this.scoring.changeLane(gameId, newLaneResult.value.id);
    await this.lanes.releaseLane(oldLaneId);

    return success(undefined);
  }

  async setLaneMaintenance(laneId: LaneId, isMaintenance: boolean): Promise<Result<void>> {
    return this.lanes.setMaintenance(laneId, isMaintenance);
  }
}
