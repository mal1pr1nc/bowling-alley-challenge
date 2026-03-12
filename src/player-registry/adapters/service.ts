import { Player, PlayerId, Result, success, failure } from '../../shared/types';
import { PlayerRegistryDrivingPort, PlayerStorageDrivenPort } from '../ports/ports';
import { Tracer } from '../../shared/tracer';

export class PlayerRegistryService implements PlayerRegistryDrivingPort {
  constructor(
    private storage: PlayerStorageDrivenPort,
    private tracer?: Tracer
  ) {}

  async registerPlayer(name: string, shoeSize: number): Promise<Result<Player>> {
    this.tracer?.trace({ hexagon: 'player-registry', layer: 'port', action: 'registerPlayer', input: { name, shoeSize } });
    
    const player: Player = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      shoeSize,
    };
    
    this.tracer?.trace({ hexagon: 'player-registry', layer: 'adapter', action: 'InMemoryPlayerStorage.save', input: player });
    await this.storage.save(player);
    
    const res = success(player);
    this.tracer?.trace({ hexagon: 'player-registry', layer: 'port', action: 'registerPlayer.output', output: res });
    return res;
  }

  async getPlayer(id: PlayerId): Promise<Result<Player>> {
    this.tracer?.trace({ hexagon: 'player-registry', layer: 'port', action: 'getPlayer', input: id });
    const player = await this.storage.findById(id);
    const res = player ? success(player) : failure(new Error(`Player ${id} not found`));
    this.tracer?.trace({ hexagon: 'player-registry', layer: 'port', action: 'getPlayer.output', output: res });
    return res;
  }

  async listPlayers(): Promise<Result<Player[]>> {
    this.tracer?.trace({ hexagon: 'player-registry', layer: 'port', action: 'listPlayers' });
    const players = await this.storage.findAll();
    const res = success(players);
    this.tracer?.trace({ hexagon: 'player-registry', layer: 'port', action: 'listPlayers.output', output: res });
    return res;
  }
}
