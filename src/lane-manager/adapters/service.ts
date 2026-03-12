import { Lane, LaneId, Result, success, failure } from '../../shared/types';
import { LaneManagerDrivingPort, LaneStorageDrivenPort } from '../ports/ports';

export class LaneManagerService implements LaneManagerDrivingPort {
  constructor(private storage: LaneStorageDrivenPort) {}

  async assignLane(): Promise<Result<Lane>> {
    const lane = await this.storage.findFirstAvailable();
    if (!lane) return failure(new Error('No lanes available'));
    
    lane.status = 'in-use';
    await this.storage.save(lane);
    return success(lane);
  }

  async assignSpecificLane(id: LaneId): Promise<Result<Lane>> {
    const lane = await this.storage.findById(id);
    if (!lane) return failure(new Error(`Lane ${id} not found`));
    if (lane.status !== 'available') return failure(new Error(`Lane ${id} is not available`));
    
    lane.status = 'in-use';
    await this.storage.save(lane);
    return success(lane);
  }

  async releaseLane(id: LaneId): Promise<Result<void>> {
    const lane = await this.storage.findById(id);
    if (!lane) return failure(new Error(`Lane ${id} not found`));
    
    lane.status = 'available';
    await this.storage.save(lane);
    return success(undefined);
  }

  async setMaintenance(id: LaneId, isMaintenance: boolean): Promise<Result<void>> {
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
    return success(await this.storage.findAll());
  }
}
