export type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };

export const success = <T>(value: T): Result<T, never> => ({ success: true, value });
export const failure = <E>(error: E): Result<never, E> => ({ success: false, error });

export type PlayerId = string;
export type LaneId = string;
export type GameId = string;

export interface Player {
  id: PlayerId;
  name: string;
  shoeSize: number;
}

export interface Lane {
  id: LaneId;
  status: 'available' | 'in-use' | 'maintenance';
}

export interface Game {
  id: GameId;
  laneId: LaneId;
  playerIds: PlayerId[];
  isComplete: boolean;
}
