import { Game, GameId, PlayerId } from '../../shared/types';
import { GameStorageDrivenPort } from '../ports/ports';

export class InMemoryGameStorage implements GameStorageDrivenPort {
  private games = new Map<GameId, { game: Game; rolls: Map<PlayerId, number[]> }>();

  async save(game: Game, rolls: Map<PlayerId, number[]>): Promise<void> {
    this.games.set(game.id, { game, rolls });
  }

  async findById(id: GameId): Promise<{ game: Game; rolls: Map<PlayerId, number[]> } | null> {
    return this.games.get(id) || null;
  }
}
