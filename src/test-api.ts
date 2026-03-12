async function testApi() {
  console.log('--- Phase 4: Testing Hexagonal Bowling API ---');

  // 1. Book a game
  console.log('1. POST /games (Alice and Bob)');
  const bookResponse = await fetch('http://localhost:3001/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerNames: ['Alice', 'Bob'] })
  });
  
  const game = await bookResponse.json() as any;
  console.log(`Game booked on lane ${game.laneId}, ID: ${game.id}`);
  const [aliceId, bobId] = game.playerIds;

  // 2. Record rolls
  console.log(`2. POST /games/${game.id}/rolls (Alice: 4, 5)`);
  await fetch(`http://localhost:3001/games/${game.id}/rolls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: aliceId, pins: 4 })
  });
  await fetch(`http://localhost:3001/games/${game.id}/rolls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: aliceId, pins: 5 })
  });

  console.log(`3. POST /games/${game.id}/rolls (Bob: 10)`);
  await fetch(`http://localhost:3001/games/${game.id}/rolls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: bobId, pins: 10 })
  });

  // 3. Get scoreboard
  console.log('4. GET /games/:id/scoreboard');
  const sbResponse = await fetch(`http://localhost:3001/games/${game.id}/scoreboard`);
  const scoreboard = await sbResponse.json() as any;

  console.log('\n--- API SCOREBOARD ---');
  scoreboard.playerScores.forEach((ps: any) => {
    const name = ps.playerId === aliceId ? 'Alice' : 'Bob';
    console.log(`${name}: Total Score = ${ps.totalScore}`);
  });
  console.log('----------------------\n');
}

// Wait a bit for server to start
setTimeout(() => {
  testApi().catch(console.error);
}, 2000);
