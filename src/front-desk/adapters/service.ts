import { Game, GameId, PlayerId, LaneId, Result, success, failure, Scoreboard } from '../../shared/types';
import { FrontDeskDrivingPort, PlayerRegistryPort, LaneManagerPort, ScoringEnginePort } from '../ports/ports';
import { Tracer } from '../../shared/tracer';

export class FrontDeskService implements FrontDeskDrivingPort {
  constructor(
    private players: PlayerRegistryPort,
    private lanes: LaneManagerPort,
    private scoring: ScoringEnginePort,
    private tracer?: Tracer
  ) {}

  async bookGame(playerNames: string[]): Promise<Result<Game>> {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'port', action: 'bookGame', input: playerNames });
    
    const playerResults = await Promise.all(playerNames.map(name => this.players.registerPlayer(name, 10)));
    const registeredPlayers = playerResults
      .filter((r): r is { success: true; value: { id: string; name: string; shoeSize: number } } => r.success)
      .map(r => r.value);
    
    if (registeredPlayers.length !== playerNames.length) {
      const err = failure(new Error('Failed to register some players'));
      this.tracer?.trace({ hexagon: 'front-desk', layer: 'port', action: 'bookGame.error', output: err });
      return err;
    }

    const laneResult = await this.lanes.assignLane();
    if (!laneResult.success) {
      this.tracer?.trace({ hexagon: 'front-desk', layer: 'port', action: 'bookGame.error', output: laneResult });
      return failure(laneResult.error);
    }

    const res = await this.scoring.startGame(laneResult.value.id, registeredPlayers.map(p => p.id));
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'port', action: 'bookGame.output', output: res });
    return res;
  }

  async recordRoll(gameId: GameId, playerId: PlayerId, pins: number): Promise<Result<void>> {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'port', action: 'recordRoll', input: { gameId, playerId, pins } });
    const res = await this.scoring.recordRoll(gameId, playerId, pins);
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'port', action: 'recordRoll.output', output: res });
    return res;
  }

  async getScoreboard(gameId: GameId): Promise<Result<Scoreboard>> {
    return this.scoring.getScoreboard(gameId);
  }

  async switchLane(gameId: GameId): Promise<Result<void>> {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'port', action: 'switchLane', input: gameId });
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
