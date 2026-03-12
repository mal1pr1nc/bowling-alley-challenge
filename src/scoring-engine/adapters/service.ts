import crypto from 'crypto';
import { Game, GameId, PlayerId, Result, success, failure, Scoreboard } from '../../shared/types';
import { ScoringEngineDrivingPort, GameStorageDrivenPort } from '../ports/ports';
import { calculateFrames } from '../domain/scoring';
import { Tracer } from '../../shared/tracer';

export class ScoringEngineService implements ScoringEngineDrivingPort {
  constructor(
    private storage: GameStorageDrivenPort,
    private tracer?: Tracer
  ) {}

  async startGame(laneId: string, playerIds: PlayerId[]): Promise<Result<Game>> {
    this.tracer?.trace({ hexagon: 'scoring-engine', layer: 'port', action: 'startGame', input: { laneId, playerIds } });
    const game: Game = {
      id: `g-${crypto.randomUUID()}`,
      laneId,
      playerIds,
      isComplete: false,
    };
    const rolls = new Map<PlayerId, number[]>();
    playerIds.forEach(pid => rolls.set(pid, []));
    
    await this.storage.save(game, rolls);
    const res = success(game);
    this.tracer?.trace({ hexagon: 'scoring-engine', layer: 'port', action: 'startGame.output', output: res });
    return res;
  }

  async recordRoll(gameId: GameId, playerId: PlayerId, pins: number): Promise<Result<void>> {
    this.tracer?.trace({ hexagon: 'scoring-engine', layer: 'port', action: 'recordRoll', input: { gameId, playerId, pins } });
    
    // Validation Rule
    if (pins < 0 || pins > 10) {
      const err = failure(new Error('Roll pins must be 0-10'));
      this.tracer?.trace({ 
        hexagon: 'scoring-engine', 
        layer: 'domain', 
        action: 'VALIDATION RULE [TRIGGERED]', 
        input: { pins }, 
        output: 'Roll pins must be 0-10',
        businessRule: 'Pin count validation'
      });
      return err;
    }

    const data = await this.storage.findById(gameId);
    if (!data) return failure(new Error('Game not found'));
    
    const playerRolls = data.rolls.get(playerId);
    if (!playerRolls) return failure(new Error('Player not in game'));
    
    // More Validation
    const frames = calculateFrames(playerRolls);
    const currentFrame = frames.length === 0 ? null : frames[frames.length - 1];
    
    if (frames.length < 10) {
      // Frames 1-9
      if (currentFrame && !currentFrame.isComplete && currentFrame.rolls.length === 1) {
        const firstRoll = currentFrame.rolls[0];
        if (pins > (10 - firstRoll)) {
          const msg = `Rejected: pins=${pins} exceeds remaining pins (${10 - firstRoll}). Frame ${frames.length}, Roll 2: First roll was ${firstRoll}, max allowed is ${10 - firstRoll}`;
          this.tracer?.trace({ 
            hexagon: 'scoring-engine', 
            layer: 'domain', 
            action: 'VALIDATION RULE [TRIGGERED]', 
            output: msg,
            businessRule: 'Pin count validation'
          });
          return failure(new Error(msg));
        }
      }
    } else {
      // Frame 10
      const f10 = frames[9];
      if (!f10.isComplete) {
        if (f10.rolls.length === 1) {
          const roll1 = f10.rolls[0];
          if (roll1 < 10 && pins > (10 - roll1)) {
            const msg = `Rejected: pins=${pins} exceeds remaining pins (${10 - roll1}). Frame 10, Roll 2: First roll was ${roll1}, max allowed is ${10 - roll1}`;
            this.tracer?.trace({ 
              hexagon: 'scoring-engine', 
              layer: 'domain', 
              action: 'VALIDATION RULE [TRIGGERED]', 
              output: msg,
              businessRule: 'Pin count validation'
            });
            return failure(new Error(msg));
          }
        } else if (f10.rolls.length === 2) {
          const roll1 = f10.rolls[0];
          const roll2 = f10.rolls[1];
          // If roll1 + roll2 < 10, frame is complete. If >= 10, we have a 3rd roll.
          if (roll1 === 10 || (roll1 + roll2 === 10)) {
             // We have a 3rd roll. If roll2 was a strike, pins can be 10.
             // If roll1 was strike and roll2 was not, pins <= 10 - roll2.
             if (roll1 === 10 && roll2 < 10 && pins > (10 - roll2)) {
                const msg = `Rejected: pins=${pins} exceeds remaining pins (${10 - roll2}). Frame 10, Roll 3: After strike, second roll was ${roll2}, max allowed is ${10 - roll2}`;
                this.tracer?.trace({ 
                  hexagon: 'scoring-engine', 
                  layer: 'domain', 
                  action: 'VALIDATION RULE [TRIGGERED]', 
                  output: msg,
                  businessRule: 'Pin count validation'
                });
                return failure(new Error(msg));
             }
          }
        }
      } else {
        return failure(new Error('Game already complete for this player'));
      }
    }

    // If we get here, rule applied successfully
    const framesBefore = calculateFrames(playerRolls);
    if (pins === 10 && (!currentFrame || currentFrame.isComplete)) {
        this.tracer?.trace({ hexagon: 'scoring-engine', layer: 'domain', action: 'STRIKE RULE [ACTIVE]', businessRule: 'Strike rule' });
    } else if (currentFrame && !currentFrame.isComplete && currentFrame.rolls.length === 1 && (currentFrame.rolls[0] + pins === 10)) {
        this.tracer?.trace({ hexagon: 'scoring-engine', layer: 'domain', action: 'SPARE RULE [ACTIVE]', businessRule: 'Spare rule' });
    }

    playerRolls.push(pins);
    
    const updatedFrames = calculateFrames(playerRolls);
    const gameIsComplete = data.game.playerIds.every(pid => {
      const pRolls = pid === playerId ? playerRolls : data.rolls.get(pid) || [];
      const pFrames = calculateFrames(pRolls);
      return pFrames.length === 10 && pFrames[9]?.isComplete;
    });

    data.game.isComplete = gameIsComplete;

    await this.storage.save(data.game, data.rolls);
    return success(undefined);
  }

  async getScoreboard(gameId: GameId): Promise<Result<Scoreboard>> {
    const data = await this.storage.findById(gameId);
    if (!data) return failure(new Error('Game not found'));

    const playerScores = data.game.playerIds.map(pid => {
      const rolls = data.rolls.get(pid) || [];
      const frames = calculateFrames(rolls);
      const totalScore = frames.length > 0 ? (frames[frames.length - 1]?.runningTotal ?? 0) : 0;
      
      return {
        playerId: pid,
        totalScore,
        frames: frames.map(f => ({ rolls: f.rolls, score: f.score }))
      };
    });

    return success({ gameId, playerScores });
  }

  async changeLane(gameId: GameId, newLaneId: string): Promise<Result<void>> {
    this.tracer?.trace({ hexagon: 'scoring-engine', layer: 'port', action: 'changeLane', input: { gameId, newLaneId } });
    const data = await this.storage.findById(gameId);
    if (!data) return failure(new Error('Game not found'));

    data.game.laneId = newLaneId;
    await this.storage.save(data.game, data.rolls);
    return success(undefined);
  }

  async getGame(gameId: GameId): Promise<Result<Game>> {
    const data = await this.storage.findById(gameId);
    return data ? success(data.game) : failure(new Error('Game not found'));
  }
}
