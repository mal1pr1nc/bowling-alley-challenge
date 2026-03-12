import { PlayerRegistryDrivingPort } from '../../player-registry/ports/ports';
import { LaneManagerDrivingPort } from '../../lane-manager/ports/ports';
import { ScoringEngineDrivingPort } from '../../scoring-engine/ports/ports';
import { PlayerRegistryPort, LaneManagerPort, ScoringEnginePort } from '../ports/ports';
import { Tracer } from '../../shared/tracer';

// These bridge adapters translate between the Front Desk's driven ports 
// and the actual driving ports of the other hexagons.
export class PlayerRegistryBridge implements PlayerRegistryPort {
  constructor(private service: PlayerRegistryDrivingPort, private tracer?: Tracer) {}
  async registerPlayer(name: string, shoeSize: number) {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'bridge', action: 'PlayerRegistryBridge.registerPlayer', input: { name, shoeSize } });
    return this.service.registerPlayer(name, shoeSize);
  }
}

export class LaneManagerBridge implements LaneManagerPort {
  constructor(private service: LaneManagerDrivingPort, private tracer?: Tracer) {}
  async assignLane() {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'bridge', action: 'LaneManagerBridge.assignLane' });
    return this.service.assignLane();
  }
  async assignSpecificLane(id: string) {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'bridge', action: 'LaneManagerBridge.assignSpecificLane', input: id });
    return this.service.assignSpecificLane(id);
  }
  async releaseLane(id: string) {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'bridge', action: 'LaneManagerBridge.releaseLane', input: id });
    return this.service.releaseLane(id);
  }
  async setMaintenance(id: string, isMaintenance: boolean) {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'bridge', action: 'LaneManagerBridge.setMaintenance', input: { id, isMaintenance } });
    return this.service.setMaintenance(id, isMaintenance);
  }
}

export class ScoringEngineBridge implements ScoringEnginePort {
  constructor(private service: ScoringEngineDrivingPort, private tracer?: Tracer) {}
  async startGame(laneId: string, playerIds: string[]) {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'bridge', action: 'ScoringEngineBridge.startGame', input: { laneId, playerIds } });
    return this.service.startGame(laneId, playerIds);
  }
  async recordRoll(gameId: string, playerId: string, pins: number) {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'bridge', action: 'ScoringEngineBridge.recordRoll', input: { gameId, playerId, pins } });
    return this.service.recordRoll(gameId, playerId, pins);
  }
  async getScoreboard(gameId: string) {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'bridge', action: 'ScoringEngineBridge.getScoreboard', input: gameId });
    return this.service.getScoreboard(gameId);
  }
  async changeLane(gameId: string, newLaneId: string) {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'bridge', action: 'ScoringEngineBridge.changeLane', input: { gameId, newLaneId } });
    return this.service.changeLane(gameId, newLaneId);
  }
  async getGame(gameId: string) {
    this.tracer?.trace({ hexagon: 'front-desk', layer: 'bridge', action: 'ScoringEngineBridge.getGame', input: gameId });
    return this.service.getGame(gameId);
  }
}
