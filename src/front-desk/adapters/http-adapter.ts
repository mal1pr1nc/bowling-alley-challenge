import express, { Request, Response } from 'express';
import { FrontDeskDrivingPort } from '../ports/ports';
import { Tracer } from '../../shared/tracer';

export class FrontDeskHttpAdapter {
  private app = express();

  constructor(private service: FrontDeskDrivingPort, private tracer: Tracer) {
    this.app.use(express.json());
    this.app.use(express.static('public'));
    this.setupRoutes();
  }

  private setupRoutes() {
    // API Status
    this.app.get('/api/status', (req: Request, res: Response) => {
      res.json({ 
        message: 'Bowling Alley Hexagonal API is running',
        endpoints: [
          'POST /games',
          'POST /games/:id/rolls',
          'GET /games/:id/scoreboard'
        ]
      });
    });

    // POST /games (book a game)
    this.app.post('/games', async (req: Request, res: Response) => {
      const { playerNames } = req.body;
      if (!Array.isArray(playerNames)) {
        return res.status(400).json({ error: 'playerNames must be an array' });
      }

      const result = await this.service.bookGame(playerNames);
      const trace = this.tracer.flush();
      
      if (result.success) {
        res.status(201).json({ value: result.value, trace });
      } else {
        res.status(500).json({ error: result.error.message, trace });
      }
    });

    // POST /games/:id/rolls (record a roll)
    this.app.post('/games/:id/rolls', async (req: Request, res: Response) => {
      const { playerId, pins } = req.body;
      const gameId = req.params.id as string;
      
      if (!playerId || typeof pins !== 'number') {
        return res.status(400).json({ error: 'playerId and pins (number) required' });
      }

      const result = await this.service.recordRoll(gameId, playerId, pins);
      const trace = this.tracer.flush();

      if (result.success) {
        res.status(200).json({ status: 'ok', trace });
      } else {
        res.status(400).json({ error: result.error.message, trace });
      }
    });

    // GET /games/:id/scoreboard
    this.app.get('/games/:id/scoreboard', async (req: Request, res: Response) => {
      const gameId = req.params.id as string;
      const result = await this.service.getScoreboard(gameId);
      if (result.success) {
        res.status(200).json(result.value);
      } else {
        res.status(404).json({ error: result.error.message });
      }
    });

    // GET /api/use-cases
    this.app.get('/api/use-cases', (req: Request, res: Response) => {
      res.json([
        {
          id: 'UC1',
          name: 'Book Game',
          actor: 'Front Desk Attendant',
          goal: 'Start a new bowling game for a group of players',
          scope: 'Bowling Alley System (Front Desk hexagon)',
          level: 'User Goal',
          preconditions: ['At least one lane is available', 'Player names are provided'],
          success: 'Game is created, lane is reserved, all players are registered',
          scenario: [
            'Attendant submits player names',
            'System registers each player in Player Registry',
            'System requests an available lane from Lane Manager',
            'Lane Manager marks lane as in-use',
            'System initializes game state in Scoring Engine',
            'System returns game confirmation with game ID and lane assignment'
          ],
          extensions: [
            { cond: 'Player registration fails', steps: ['System returns error, no lane is assigned'] },
            { cond: 'No lanes available', steps: ['System returns "no lanes available" error', 'Already-registered players remain in registry (no rollback)'] }
          ]
        },
        {
          id: 'UC2',
          name: 'Record Roll',
          actor: 'Bowler / Lane Sensor',
          goal: 'Register the pins knocked down in a single roll',
          scope: 'Bowling Alley System (Scoring Engine hexagon)',
          level: 'Subfunction',
          preconditions: ['A game is in progress'],
          success: 'Roll is recorded and score is updated',
          scenario: [
            'Roll information (GameID, PlayerID, Pins) is sent to Front Desk',
            'Front Desk delegates to Scoring Engine',
            'Scoring Engine validates the roll pins',
            'Scoring Engine updates the player\'s frames and calculates bonuses',
            'Scoreboard reflects the updated total'
          ],
          extensions: [
            { cond: 'Invalid pin count', steps: ['System rejects roll with explanation'] }
          ]
        },
        {
          id: 'UC3',
          name: 'View Scoreboard',
          actor: 'Bowler / Attendant',
          goal: 'View current frames, running totals, and strike/spare markers',
          scope: 'Bowling Alley System (Scoring Engine hexagon)',
          level: 'User Goal',
          preconditions: ['A game exists'],
          success: 'Scoreboard is displayed',
          scenario: [
            'Attendant requests scoreboard for a GameID',
            'Scoring Engine returns all frames and the current score',
            'Front Desk displays the result'
          ]
        },
        {
          id: 'UC4',
          name: 'Switch Lane',
          actor: 'Attendant / Manager',
          goal: 'Move a game in progress to a different lane due to mechanical failure',
          scope: 'Bowling Alley System (Front Desk orchestration)',
          level: 'User Goal',
          preconditions: ['A game is in progress', 'Another lane is available'],
          success: 'Game continues on new lane, old lane is released',
          scenario: [
            'Manager requests a lane switch for an active game',
            'Front Desk requests a new available lane from Lane Manager',
            'Front Desk updates the Scoring Engine with the new lane ID',
            'Front Desk requests Lane Manager to release the old lane'
          ]
        }
      ]);
    });
  }

  listen(port: number) {
    this.app.listen(port, () => {
      console.log(`Front Desk API listening on port ${port}`);
    });
  }
}
