import { Lane, LaneId } from '../../shared/types';
import { LaneStorageDrivenPort } from '../ports/ports';

export class InMemoryLaneStorage implements LaneStorageDrivenPort {
  private lanes = new Map<LaneId, Lane>();

  async save(lane: Lane): Promise<void> {
    this.lanes.set(lane.id, lane);
  }

  async findById(id: LaneId): Promise<Lane | null> {
    return this.lanes.get(id) || null;
  }

  async findFirstAvailable(): Promise<Lane | null> {
    return Array.from(this.lanes.values()).find(l => l.status === 'available') || null;
  }

  async findAll(): Promise<Lane[]> {
    return Array.from(this.lanes.values());
  }
}
