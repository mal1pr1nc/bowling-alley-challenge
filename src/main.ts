// The Composition Root - ONLY file that wires hexagons together
import { PlayerRegistryService } from './player-registry/adapters/service';
import { InMemoryPlayerStorage } from './player-registry/adapters/in-memory-storage';

import { LaneManagerService } from './lane-manager/adapters/service';
import { InMemoryLaneStorage } from './lane-manager/adapters/in-memory-storage';

import { ScoringEngineService } from './scoring-engine/adapters/service';
import { InMemoryGameStorage } from './scoring-engine/adapters/in-memory-storage';

import { FrontDeskService } from './front-desk/adapters/service';
import { PlayerRegistryBridge, LaneManagerBridge, ScoringEngineBridge } from './front-desk/bridges/bridges';
import { FrontDeskHttpAdapter } from './front-desk/adapters/http-adapter';

async function main() {
  console.log('--- Phase 4: Starting Hexagonal Bowling API ---');

  // 1. Initialize Hexagons
  const playerRegistry = new PlayerRegistryService(new InMemoryPlayerStorage());
  
  const laneStorage = new InMemoryLaneStorage();
  for (let i = 1; i <= 10; i++) {
    await laneStorage.save({ id: `lane-${i}`, status: 'available' });
  }
  const laneManager = new LaneManagerService(laneStorage);

  const scoringEngine = new ScoringEngineService(new InMemoryGameStorage());

  // 2. Wire Front Desk via Bridges
  const frontDesk = new FrontDeskService(
    new PlayerRegistryBridge(playerRegistry),
    new LaneManagerBridge(laneManager),
    new ScoringEngineBridge(scoringEngine)
  );

  // 3. Start HTTP Driving Adapter
  const httpAdapter = new FrontDeskHttpAdapter(frontDesk);
  httpAdapter.listen(3001);

  console.log('API is ready for POST /games, POST /games/:id/rolls, GET /games/:id/scoreboard on port 3001');
}

main().catch(console.error);
