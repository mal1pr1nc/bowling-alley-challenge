import { describe, it, expect } from 'vitest';
import { calculateFrames } from '../scoring';

describe('Scoring Engine Domain', () => {
  it('calculates a perfect game (12 strikes) as 300', () => {
    const rolls = Array(12).fill(10);
    const frames = calculateFrames(rolls);
    expect(frames.length).toBe(10);
    expect(frames[9].runningTotal).toBe(300);
    expect(frames[9].isComplete).toBe(true);
  });

  it('calculates all spares (5,5 x 10 + 5) as 150', () => {
    const rolls = Array(21).fill(5);
    const frames = calculateFrames(rolls);
    expect(frames.length).toBe(10);
    expect(frames[9].runningTotal).toBe(150);
    expect(frames[9].isComplete).toBe(true);
  });

  it('calculates all open frames (1,1 x 10) as 20', () => {
    const rolls = Array(20).fill(1);
    const frames = calculateFrames(rolls);
    expect(frames.length).toBe(10);
    expect(frames[9].runningTotal).toBe(20);
    expect(frames[9].isComplete).toBe(true);
  });

  it('calculates mixed game with strike, spare, and open frames correctly', () => {
    // Frame 1: 10 (Strike) -> 10 + 4 + 5 = 19
    // Frame 2: 4, 5 (Open) -> 9 -> Total 28
    // Frame 3: 7, 3 (Spare) -> 10 + 6 = 16 -> Total 44
    // Frame 4: 6, 2 (Open) -> 8 -> Total 52
    const rolls = [10, 4, 5, 7, 3, 6, 2];
    const frames = calculateFrames(rolls);
    expect(frames[0].runningTotal).toBe(19);
    expect(frames[1].runningTotal).toBe(28);
    expect(frames[2].runningTotal).toBe(44);
    expect(frames[3].runningTotal).toBe(52);
  });

  it('calculates incomplete games correctly (mid-game scoreboard)', () => {
    // Frame 1: 10 (Strike) -> 10 + 4 + ?
    // Next rolls: 4
    const rolls = [10, 4];
    const frames = calculateFrames(rolls);
    expect(frames.length).toBe(2);
    expect(frames[0].isComplete).toBe(false);
    expect(frames[1].isComplete).toBe(false);
    expect(frames[0].runningTotal).toBe(14); // 10 + 4 + 0
    expect(frames[1].runningTotal).toBe(18); // 14 + 4
  });
});
