import { Lane, LaneId, Result } from '../../shared/types';

export interface LaneManagerDrivingPort {
  assignLane(): Promise<Result<Lane>>;
  assignSpecificLane(id: LaneId): Promise<Result<Lane>>;
  releaseLane(id: LaneId): Promise<Result<void>>;
  setMaintenance(id: LaneId, isMaintenance: boolean): Promise<Result<void>>;
  getLaneStatus(id: LaneId): Promise<Result<Lane>>;
  listLanes(): Promise<Result<Lane[]>>;
}

export interface LaneStorageDrivenPort {
  save(lane: Lane): Promise<void>;
  findById(id: LaneId): Promise<Lane | null>;
  findFirstAvailable(): Promise<Lane | null>;
  findAll(): Promise<Lane[]>;
}
