import { PlayerRegistryService } from './player-registry/adapters/service';
import { InMemoryPlayerStorage } from './player-registry/adapters/in-memory-storage';
import { LaneManagerService } from './lane-manager/adapters/service';
import { InMemoryLaneStorage } from './lane-manager/adapters/in-memory-storage';
import { ScoringEngineService } from './scoring-engine/adapters/service';
import { InMemoryGameStorage } from './scoring-engine/adapters/in-memory-storage';
import { FrontDeskService } from './front-desk/adapters/service';
import { PlayerRegistryBridge, LaneManagerBridge, ScoringEngineBridge } from './front-desk/bridges/bridges';

async function testLaneManagement() {
  console.log('--- Phase 3: Testing Lane Manager ---');

  const playerRegistry = new PlayerRegistryService(new InMemoryPlayerStorage());
  const laneStorage = new InMemoryLaneStorage();
  await laneStorage.save({ id: 'lane-1', status: 'available' });
  await laneStorage.save({ id: 'lane-2', status: 'available' });
  const laneManager = new LaneManagerService(laneStorage);
  const scoringEngine = new ScoringEngineService(new InMemoryGameStorage());

  const frontDesk = new FrontDeskService(
    new PlayerRegistryBridge(playerRegistry),
    new LaneManagerBridge(laneManager),
    new ScoringEngineBridge(scoringEngine)
  );

  console.log('1. Testing Maintenance Mode...');
  await frontDesk.setLaneMaintenance('lane-2', true);
  
  const lanes = (await laneManager.listLanes() as any).value;
  const lane2 = lanes.find((l: any) => l.id === 'lane-2');
  console.log(`Lane 2 status: ${lane2.status} (Expected: maintenance)`);

  const game1Result = await frontDesk.bookGame(['Alice']);
  const game1 = (game1Result as any).value;
  console.log(`Game 1 started on lane: ${game1.laneId} (Expected: lane-1)`);

  const game2Result = await frontDesk.bookGame(['Bob']);
  console.log(`Game 2 booking status: ${game2Result.success} (Expected: false - no lanes available)`);

  console.log('\n2. Testing Lane Switching...');
  await frontDesk.setLaneMaintenance('lane-2', false); // Back to available
  console.log('Lane 2 is now available.');

  await frontDesk.switchLane(game1.id);
  const game1AfterSwitch = (await scoringEngine.getGame(game1.id) as any).value;
  console.log(`Game 1 is now on lane: ${game1AfterSwitch.laneId} (Expected: lane-2)`);

  const lane1Status = (await laneManager.getLaneStatus('lane-1') as any).value;
  console.log(`Lane 1 status: ${lane1Status.status} (Expected: available)`);

  console.log('\n3. Testing Concurrent Games...');
  const game3Result = await frontDesk.bookGame(['Charlie']);
  const game3 = (game3Result as any).value;
  console.log(`Game 3 started on lane: ${game3.laneId} (Expected: lane-1)`);

  console.log('Success: Concurrent games running on lane-1 and lane-2.');
}

testLaneManagement().catch(console.error);
