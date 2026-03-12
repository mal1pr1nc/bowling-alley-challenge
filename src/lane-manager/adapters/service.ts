import { Lane, LaneId, Result, success, failure } from '../../shared/types';
import { LaneManagerDrivingPort, LaneStorageDrivenPort } from '../ports/ports';
import { Tracer } from '../../shared/tracer';

export class LaneManagerService implements LaneManagerDrivingPort {
  constructor(
    private storage: LaneStorageDrivenPort,
    private tracer?: Tracer
  ) {}

  async assignLane(): Promise<Result<Lane>> {
    this.tracer?.trace({ hexagon: 'lane-manager', layer: 'port', action: 'assignLane' });
    const lane = await this.storage.findFirstAvailable();
    if (!lane) {
      const err = failure(new Error('No lanes available'));
      this.tracer?.trace({ hexagon: 'lane-manager', layer: 'port', action: 'assignLane.error', output: err });
      return err;
    }
    
    lane.status = 'in-use';
    this.tracer?.trace({ hexagon: 'lane-manager', layer: 'adapter', action: 'InMemoryLaneStorage.save', input: lane });
    await this.storage.save(lane);
    const res = success(lane);
    this.tracer?.trace({ hexagon: 'lane-manager', layer: 'port', action: 'assignLane.output', output: res });
    return res;
  }

  async assignSpecificLane(id: LaneId): Promise<Result<Lane>> {
    this.tracer?.trace({ hexagon: 'lane-manager', layer: 'port', action: 'assignSpecificLane', input: id });
    const lane = await this.storage.findById(id);
    if (!lane) {
      const err = failure(new Error(`Lane ${id} not found`));
      this.tracer?.trace({ hexagon: 'lane-manager', layer: 'port', action: 'assignSpecificLane.error', output: err });
      return err;
    }
    if (lane.status !== 'available') {
      const err = failure(new Error(`Lane ${id} is not available`));
      this.tracer?.trace({ hexagon: 'lane-manager', layer: 'port', action: 'assignSpecificLane.error', output: err });
      return err;
    }
    
    lane.status = 'in-use';
    await this.storage.save(lane);
    const res = success(lane);
    this.tracer?.trace({ hexagon: 'lane-manager', layer: 'port', action: 'assignSpecificLane.output', output: res });
    return res;
  }

  async releaseLane(id: LaneId): Promise<Result<void>> {
    this.tracer?.trace({ hexagon: 'lane-manager', layer: 'port', action: 'releaseLane', input: id });
    const lane = await this.storage.findById(id);
    if (!lane) return failure(new Error(`Lane ${id} not found`));
    
    lane.status = 'available';
    await this.storage.save(lane);
    return success(undefined);
  }

  async setMaintenance(id: LaneId, isMaintenance: boolean): Promise<Result<void>> {
    this.tracer?.trace({ hexagon: 'lane-manager', layer: 'port', action: 'setMaintenance', input: { id, isMaintenance } });
    const lane = await this.storage.findById(id);
    if (!lane) return failure(new Error(`Lane ${id} not found`));
    
    lane.status = isMaintenance ? 'maintenance' : 'available';
    await this.storage.save(lane);
    return success(undefined);
  }

  async getLaneStatus(id: LaneId): Promise<Result<Lane>> {
    const lane = await this.storage.findById(id);
    return lane ? success(lane) : failure(new Error(`Lane ${id} not found`));
  }

  async listLanes(): Promise<Result<Lane[]>> {
    const lanes = await this.storage.findAll();
    return success(lanes);
  }
}
