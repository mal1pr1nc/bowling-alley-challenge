import { describe, it, expect, beforeEach } from 'vitest';
import { FrontDeskService } from '../adapters/service';
import { PlayerRegistryService } from '../../player-registry/adapters/service';
import { InMemoryPlayerStorage } from '../../player-registry/adapters/in-memory-storage';
import { LaneManagerService } from '../../lane-manager/adapters/service';
import { InMemoryLaneStorage } from '../../lane-manager/adapters/in-memory-storage';
import { ScoringEngineService } from '../../scoring-engine/adapters/service';
import { InMemoryGameStorage } from '../../scoring-engine/adapters/in-memory-storage';
import { PlayerRegistryBridge, LaneManagerBridge, ScoringEngineBridge } from '../bridges/bridges';

function createWiredSystem(laneCount = 10) {
  const playerStorage = new InMemoryPlayerStorage();
  const playerService = new PlayerRegistryService(playerStorage);

  const laneStorage = new InMemoryLaneStorage();
  for (let i = 1; i <= laneCount; i++) {
    laneStorage.save({ id: `lane-${i}`, status: 'available' });
  }
  const laneService = new LaneManagerService(laneStorage);

  const gameStorage = new InMemoryGameStorage();
  const scoringService = new ScoringEngineService(gameStorage);

  const frontDesk = new FrontDeskService(
    new PlayerRegistryBridge(playerService),
    new LaneManagerBridge(laneService),
    new ScoringEngineBridge(scoringService)
  );

  return { frontDesk, playerService, laneService, scoringService };
}

describe('Front Desk (Full Orchestration)', () => {
  let system: ReturnType<typeof createWiredSystem>;

  beforeEach(() => {
    system = createWiredSystem();
  });

  it('books a game — creates players, assigns lane, starts game', async () => {
    const result = await system.frontDesk.bookGame(['Alice', 'Bob']);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.playerIds.length).toBe(2);
      expect(result.value.laneId).toMatch(/^lane-/);
      expect(result.value.isComplete).toBe(false);
      expect(result.value.id).toMatch(/^g-/);
    }
  });

  it('fails to book when no lanes available', async () => {
    const noLanes = createWiredSystem(0);
    const result = await noLanes.frontDesk.bookGame(['Alice']);
    expect(result.success).toBe(false);
  });

  it('records a roll and updates scoreboard', async () => {
    const book = await system.frontDesk.bookGame(['Alice']);
    if (!book.success) throw new Error('Booking failed');

    const playerId = book.value.playerIds[0];
    const roll = await system.frontDesk.recordRoll(book.value.id, playerId, 7);
    expect(roll.success).toBe(true);

    const sb = await system.frontDesk.getScoreboard(book.value.id);
    expect(sb.success).toBe(true);
    if (sb.success) {
      expect(sb.value.playerScores[0].frames[0].rolls).toContain(7);
    }
  });

  it('switches lane — score preserved, old lane released', async () => {
    const book = await system.frontDesk.bookGame(['Alice']);
    if (!book.success) throw new Error('Booking failed');

    const playerId = book.value.playerIds[0];
    const oldLane = book.value.laneId;

    // Record a roll before switching
    await system.frontDesk.recordRoll(book.value.id, playerId, 5);

    const switchResult = await system.frontDesk.switchLane(book.value.id);
    expect(switchResult.success).toBe(true);

    // Verify score preserved
    const sb = await system.frontDesk.getScoreboard(book.value.id);
    if (sb.success) {
      expect(sb.value.playerScores[0].frames[0].rolls).toContain(5);
    }

    // Verify old lane released
    const oldLaneStatus = await system.laneService.getLaneStatus(oldLane);
    if (oldLaneStatus.success) {
      expect(oldLaneStatus.value.status).toBe('available');
    }
  });

  it('plays a perfect game — score reaches 300', async () => {
    const book = await system.frontDesk.bookGame(['Alice']);
    if (!book.success) throw new Error('Booking failed');

    const playerId = book.value.playerIds[0];
    // 12 strikes for a perfect game
    for (let i = 0; i < 12; i++) {
      const roll = await system.frontDesk.recordRoll(book.value.id, playerId, 10);
      expect(roll.success).toBe(true);
    }

    const sb = await system.frontDesk.getScoreboard(book.value.id);
    expect(sb.success).toBe(true);
    if (sb.success) {
      expect(sb.value.playerScores[0].totalScore).toBe(300);
    }
  });

  it('rejects invalid roll (pins exceed remaining)', async () => {
    const book = await system.frontDesk.bookGame(['Alice']);
    if (!book.success) throw new Error('Booking failed');

    const playerId = book.value.playerIds[0];
    await system.frontDesk.recordRoll(book.value.id, playerId, 7);
    const result = await system.frontDesk.recordRoll(book.value.id, playerId, 5); // 7+5=12 > 10
    expect(result.success).toBe(false);
  });

  it('gets scoreboard for non-existent game', async () => {
    const result = await system.frontDesk.getScoreboard('g-nonexistent');
    expect(result.success).toBe(false);
  });

  it('books multiple games on different lanes', async () => {
    const game1 = await system.frontDesk.bookGame(['Alice']);
    const game2 = await system.frontDesk.bookGame(['Bob']);
    expect(game1.success).toBe(true);
    expect(game2.success).toBe(true);
    if (game1.success && game2.success) {
      expect(game1.value.laneId).not.toBe(game2.value.laneId);
    }
  });
});
