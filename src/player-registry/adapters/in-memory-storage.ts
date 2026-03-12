import { Player, PlayerId } from '../../shared/types';
import { PlayerStorageDrivenPort } from '../ports/ports';

export class InMemoryPlayerStorage implements PlayerStorageDrivenPort {
  private players = new Map<PlayerId, Player>();

  async save(player: Player): Promise<void> {
    this.players.set(player.id, player);
  }

  async findById(id: PlayerId): Promise<Player | null> {
    return this.players.get(id) || null;
  }

  async findAll(): Promise<Player[]> {
    return Array.from(this.players.values());
  }
}
