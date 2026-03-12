import { PlayerRegistryDrivingPort } from '../../player-registry/ports/ports';
import { LaneManagerDrivingPort } from '../../lane-manager/ports/ports';
import { ScoringEngineDrivingPort } from '../../scoring-engine/ports/ports';
import { PlayerRegistryPort, LaneManagerPort, ScoringEnginePort } from '../ports/ports';

// These bridge adapters translate between the Front Desk's driven ports 
// and the actual driving ports of the other hexagons.
export class PlayerRegistryBridge implements PlayerRegistryPort {
  constructor(private service: PlayerRegistryDrivingPort) {}
  async registerPlayer(name: string, shoeSize: number) {
    return this.service.registerPlayer(name, shoeSize);
  }
}

export class LaneManagerBridge implements LaneManagerPort {
  constructor(private service: LaneManagerDrivingPort) {}
  async assignLane() {
    return this.service.assignLane();
  }
  async assignSpecificLane(id: string) {
    return this.service.assignSpecificLane(id);
  }
  async releaseLane(id: string) {
    return this.service.releaseLane(id);
  }
  async setMaintenance(id: string, isMaintenance: boolean) {
    return this.service.setMaintenance(id, isMaintenance);
  }
}

export class ScoringEngineBridge implements ScoringEnginePort {
  constructor(private service: ScoringEngineDrivingPort) {}
  async startGame(laneId: string, playerIds: string[]) {
    return this.service.startGame(laneId, playerIds);
  }
  async recordRoll(gameId: string, playerId: string, pins: number) {
    return this.service.recordRoll(gameId, playerId, pins);
  }
  async getScoreboard(gameId: string) {
    return this.service.getScoreboard(gameId);
  }
  async changeLane(gameId: string, newLaneId: string) {
    return this.service.changeLane(gameId, newLaneId);
  }
  async getGame(gameId: string) {
    return this.service.getGame(gameId);
  }
}
