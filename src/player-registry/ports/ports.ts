import { Player, PlayerId, Result } from '../../shared/types';

export interface PlayerRegistryDrivingPort {
  registerPlayer(name: string, shoeSize: number): Promise<Result<Player>>;
  getPlayer(id: PlayerId): Promise<Result<Player>>;
  listPlayers(): Promise<Result<Player[]>>;
}

export interface PlayerStorageDrivenPort {
  save(player: Player): Promise<void>;
  findById(id: PlayerId): Promise<Player | null>;
  findAll(): Promise<Player[]>;
}
