import { PlayerRegistryService } from './player-registry/adapters/service';
import { InMemoryPlayerStorage } from './player-registry/adapters/in-memory-storage';
import { LaneManagerService } from './lane-manager/adapters/service';
import { InMemoryLaneStorage } from './lane-manager/adapters/in-memory-storage';
import { ScoringEngineService } from './scoring-engine/adapters/service';
import { InMemoryGameStorage } from './scoring-engine/adapters/in-memory-storage';
import { FrontDeskService } from './front-desk/adapters/service';
import { PlayerRegistryBridge, LaneManagerBridge, ScoringEngineBridge } from './front-desk/bridges/bridges';

async function testScoring() {
  console.log('--- Phase 2: Testing Real Scoring Engine ---');

  const playerRegistry = new PlayerRegistryService(new InMemoryPlayerStorage());
  const laneStorage = new InMemoryLaneStorage();
  for (let i = 1; i <= 10; i++) {
    await laneStorage.save({ id: `lane-${i}`, status: 'available' });
  }
  const laneManager = new LaneManagerService(laneStorage);
  const scoringEngine = new ScoringEngineService(new InMemoryGameStorage());

  const frontDesk = new FrontDeskService(
    new PlayerRegistryBridge(playerRegistry),
    new LaneManagerBridge(laneManager),
    new ScoringEngineBridge(scoringEngine)
  );

  const gameResult = await frontDesk.bookGame(['Striker']);
  if (!gameResult.success) return;
  const game = gameResult.value;
  const strikerId = game.playerIds[0]!;

  console.log('Testing a perfect game (12 strikes)...');
  for (let i = 0; i < 12; i++) {
    await frontDesk.recordRoll(game.id, strikerId, 10);
  }

  let scoreboard = (await frontDesk.getScoreboard(game.id) as any).value;
  console.log(`Striker Total Score: ${scoreboard.playerScores[0].totalScore} (Expected: 300)`);

  console.log('\nTesting a game with spares...');
  const spareGameResult = await frontDesk.bookGame(['Sparer']);
  if (!spareGameResult.success) {
    console.error('Failed to book spare game:', spareGameResult.error);
    return;
  }
  const spareGame = spareGameResult.value;
  const sparerId = spareGame.playerIds[0]!;

  for (let i = 0; i < 21; i++) {
    const res = await frontDesk.recordRoll(spareGame.id, sparerId, 5);
    if (!res.success) {
      console.error(`Roll ${i} failed:`, res.error);
      break;
    }
  }
  
  const sbResult = await frontDesk.getScoreboard(spareGame.id);
  if (!sbResult.success) {
    console.error('Failed to get scoreboard:', sbResult.error);
    return;
  }
  scoreboard = sbResult.value;
  console.log(`Sparer Total Score: ${scoreboard.playerScores[0].totalScore} (Expected: 150)`);

  console.log('\nTesting an open game...');
  const openGameResult = await frontDesk.bookGame(['Opener']);
  if (!openGameResult.success) return;
  const openGame = openGameResult.value;
  const openerId = openGame.playerIds[0]!;

  // 20 rolls of 1
  for (let i = 0; i < 20; i++) {
    await frontDesk.recordRoll(openGame.id, openerId, 1);
  }
  
  scoreboard = (await frontDesk.getScoreboard(openGame.id) as any).value;
  console.log(`Opener Total Score: ${scoreboard.playerScores[0].totalScore} (Expected: 20)`);
}

testScoring().catch(console.error);
