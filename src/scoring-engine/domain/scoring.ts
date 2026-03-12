export interface Frame {
  rolls: number[];
  score: number;
  runningTotal: number;
  isComplete: boolean;
}

export function calculateFrames(rolls: number[]): Frame[] {
  const frames: Frame[] = [];
  let rollIndex = 0;
  let runningTotal = 0;

  for (let frameIndex = 0; frameIndex < 10; frameIndex++) {
    if (rollIndex >= rolls.length) break;

    // Frame 1-9
    if (frameIndex < 9) {
      const roll1 = rolls[rollIndex] ?? 0;
      
      if (roll1 === 10) { // Strike
        const next1 = rolls[rollIndex + 1];
        const next2 = rolls[rollIndex + 2];
        const isComplete = next1 !== undefined && next2 !== undefined;
        const frameScore = 10 + (next1 ?? 0) + (next2 ?? 0);
        runningTotal += frameScore;
        frames.push({
          rolls: [10],
          score: frameScore,
          runningTotal,
          isComplete
        });
        rollIndex += 1;
      } else {
        const roll2 = rolls[rollIndex + 1];
        if (roll2 === undefined) { // Incomplete frame
          frames.push({
            rolls: [roll1],
            score: roll1,
            runningTotal: runningTotal + roll1,
            isComplete: false
          });
          break;
        }

        if (roll1 + roll2 === 10) { // Spare
          const next1 = rolls[rollIndex + 2];
          const isComplete = next1 !== undefined;
          const frameScore = 10 + (next1 ?? 0);
          runningTotal += frameScore;
          frames.push({
            rolls: [roll1, roll2],
            score: frameScore,
            runningTotal,
            isComplete
          });
        } else { // Open
          const frameScore = roll1 + roll2;
          runningTotal += frameScore;
          frames.push({
            rolls: [roll1, roll2],
            score: frameScore,
            runningTotal,
            isComplete: true
          });
        }
        rollIndex += 2;
      }
    } 
    // Frame 10
    else {
      const roll1 = rolls[rollIndex] ?? 0;
      const roll2 = rolls[rollIndex + 1];
      const roll3 = rolls[rollIndex + 2];

      const frameRolls: number[] = [roll1];
      if (roll2 !== undefined) frameRolls.push(roll2);
      if (roll3 !== undefined) frameRolls.push(roll3);

      let isComplete = false;
      if (roll1 === 10 || (roll1 + (roll2 ?? 0) === 10)) {
        isComplete = roll3 !== undefined;
      } else {
        isComplete = roll2 !== undefined;
      }

      const frameScore = frameRolls.reduce((a, b) => a + b, 0);
      runningTotal += frameScore;
      frames.push({
        rolls: frameRolls,
        score: frameScore,
        runningTotal,
        isComplete
      });
      break; // End of game
    }
  }

  return frames;
}

export function calculateTotalScore(rolls: number[]): number {
  const frames = calculateFrames(rolls);
  // Total score is the sum of frame scores, but we must only count frames that have all their bonuses.
  // Actually, the running total of the last frame is the score so far.
  return frames.length > 0 ? frames[frames.length - 1]!.runningTotal : 0;
}
