import express, { Request, Response } from 'express';
import { FrontDeskDrivingPort } from '../ports/ports';

export class FrontDeskHttpAdapter {
  private app = express();

  constructor(private service: FrontDeskDrivingPort) {
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    // Root / (Welcome/Status)
    this.app.get('/', (req: Request, res: Response) => {
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
      if (result.success) {
        res.status(201).json(result.value);
      } else {
        res.status(500).json({ error: result.error.message });
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
      if (result.success) {
        res.status(200).json({ status: 'ok' });
      } else {
        res.status(500).json({ error: result.error.message });
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
  }

  listen(port: number) {
    this.app.listen(port, () => {
      console.log(`Front Desk API listening on port ${port}`);
    });
  }
}
