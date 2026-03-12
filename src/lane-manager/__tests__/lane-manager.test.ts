import { describe, it, expect, beforeEach } from 'vitest';
import { LaneManagerService } from '../adapters/service';
import { InMemoryLaneStorage } from '../adapters/in-memory-storage';

function createStorageWithLanes(count: number): InMemoryLaneStorage {
  const storage = new InMemoryLaneStorage();
  for (let i = 1; i <= count; i++) {
    storage.save({ id: `lane-${i}`, status: 'available' });
  }
  return storage;
}

describe('Lane Manager', () => {
  let service: LaneManagerService;

  beforeEach(() => {
    service = new LaneManagerService(createStorageWithLanes(10));
  });

  it('assigns first available lane and marks it in-use', async () => {
    const result = await service.assignLane();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.id).toBe('lane-1');
      expect(result.value.status).toBe('in-use');
    }
  });

  it('releases a lane back to available', async () => {
    const assign = await service.assignLane();
    if (!assign.success) throw new Error('Assign failed');

    const release = await service.releaseLane(assign.value.id);
    expect(release.success).toBe(true);

    const status = await service.getLaneStatus(assign.value.id);
    expect(status.success).toBe(true);
    if (status.success) {
      expect(status.value.status).toBe('available');
    }
  });

  it('sets lane to maintenance and back', async () => {
    const result = await service.setMaintenance('lane-5', true);
    expect(result.success).toBe(true);

    const status = await service.getLaneStatus('lane-5');
    if (status.success) {
      expect(status.value.status).toBe('maintenance');
    }

    await service.setMaintenance('lane-5', false);
    const status2 = await service.getLaneStatus('lane-5');
    if (status2.success) {
      expect(status2.value.status).toBe('available');
    }
  });

  it('returns failure when no lanes are available', async () => {
    const smallService = new LaneManagerService(createStorageWithLanes(1));
    await smallService.assignLane(); // take the only lane

    const result = await smallService.assignLane();
    expect(result.success).toBe(false);
  });

  it('assigns a specific lane when available', async () => {
    const result = await service.assignSpecificLane('lane-7');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.id).toBe('lane-7');
      expect(result.value.status).toBe('in-use');
    }
  });

  it('fails to assign a specific lane when occupied', async () => {
    await service.assignSpecificLane('lane-7');
    const result = await service.assignSpecificLane('lane-7');
    expect(result.success).toBe(false);
  });

  it('lists all lanes', async () => {
    const result = await service.listLanes();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.length).toBe(10);
    }
  });
});
