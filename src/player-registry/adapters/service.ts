import { Player, PlayerId, Result, success, failure } from '../../shared/types';
import { PlayerRegistryDrivingPort, PlayerStorageDrivenPort } from '../ports/ports';

export class PlayerRegistryService implements PlayerRegistryDrivingPort {
  constructor(private storage: PlayerStorageDrivenPort) {}

  async registerPlayer(name: string, shoeSize: number): Promise<Result<Player>> {
    const player: Player = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      shoeSize,
    };
    await this.storage.save(player);
    return success(player);
  }

  async getPlayer(id: PlayerId): Promise<Result<Player>> {
    const player = await this.storage.findById(id);
    return player ? success(player) : failure(new Error(`Player ${id} not found`));
  }

  async listPlayers(): Promise<Result<Player[]>> {
    return success(await this.storage.findAll());
  }
}
