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
import { Tracer } from './shared/tracer';

async function main() {
  console.log('--- Phase 4: Starting Hexagonal Bowling API ---');

  const tracer = new Tracer();

  // 1. Initialize Hexagons
  const playerRegistry = new PlayerRegistryService(new InMemoryPlayerStorage(), tracer);
  
  const laneStorage = new InMemoryLaneStorage();
  for (let i = 1; i <= 10; i++) {
    await laneStorage.save({ id: `lane-${i}`, status: 'available' });
  }
  const laneManager = new LaneManagerService(laneStorage, tracer);

  const scoringEngine = new ScoringEngineService(new InMemoryGameStorage(), tracer);

  // 2. Wire Front Desk via Bridges
  const frontDesk = new FrontDeskService(
    new PlayerRegistryBridge(playerRegistry, tracer),
    new LaneManagerBridge(laneManager, tracer),
    new ScoringEngineBridge(scoringEngine, tracer),
    tracer
  );

  // 3. Start HTTP Driving Adapter
  const httpAdapter = new FrontDeskHttpAdapter(frontDesk, tracer);
  httpAdapter.listen(3001);

  console.log('API is ready for POST /games, POST /games/:id/rolls, GET /games/:id/scoreboard on port 3001');
}

main().catch(console.error);
