import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { FrontDeskDrivingPort } from '../ports/ports';
import { Tracer } from '../../shared/tracer';

// Simple in-memory rate limiter (no dependency needed)
const rateLimiter = (() => {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const WINDOW_MS = 60_000; // 1 minute
  const MAX_HITS = 30;      // 30 requests per minute per IP

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = hits.get(ip);

    if (!record || now > record.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      return next();
    }

    record.count++;
    if (record.count > MAX_HITS) {
      res.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    next();
  };
})();

// Input sanitization
function sanitizeName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 50) return null;
  // Alphanumeric, spaces, hyphens, apostrophes only
  if (!/^[a-zA-Z0-9 '\-]+$/.test(trimmed)) return null;
  return trimmed;
}

export class FrontDeskHttpAdapter {
  private app = express();

  constructor(private service: FrontDeskDrivingPort, private tracer: Tracer) {
    // Security: disable x-powered-by header (H2)
    this.app.disable('x-powered-by');

    // Security: limit JSON body size
    this.app.use(express.json({ limit: '16kb' }));

    // Security: rate limiting on all routes
    this.app.use(rateLimiter);

    // Security: set basic security headers
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('X-Frame-Options', 'DENY');
      res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    });

    this.app.use(express.static(path.join(__dirname, '../../../public')));
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
          'GET /games/:id/scoreboard',
          'POST /games/:id/switch-lane'
        ]
      });
    });

    // POST /games (book a game)
    this.app.post('/games', async (req: Request, res: Response) => {
      const { playerNames } = req.body;
      if (!Array.isArray(playerNames)) {
        return res.status(400).json({ error: 'playerNames must be an array' });
      }

      // Input validation (L3)
      if (playerNames.length < 1 || playerNames.length > 4) {
        return res.status(400).json({ error: 'Must have 1-4 players' });
      }

      const sanitized: string[] = [];
      for (const name of playerNames) {
        const clean = sanitizeName(name);
        if (!clean) {
          return res.status(400).json({ error: `Invalid player name: must be 1-50 alphanumeric characters` });
        }
        sanitized.push(clean);
      }

      const result = await this.service.bookGame(sanitized);
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

      // Input validation (L3): pins must be integer 0-10
      if (!Number.isInteger(pins) || pins < 0 || pins > 10) {
        return res.status(400).json({ error: 'pins must be an integer between 0 and 10' });
      }

      const result = await this.service.recordRoll(gameId, playerId, pins);
      const trace = this.tracer.flush();

      if (result.success) {
        res.status(200).json({ status: 'ok', trace });
      } else {
        res.status(400).json({ error: result.error.message, trace });
      }
    });

    // POST /games/:id/switch-lane (UC4)
    this.app.post('/games/:id/switch-lane', async (req: Request, res: Response) => {
      const gameId = req.params.id as string;
      const result = await this.service.switchLane(gameId);
      const trace = this.tracer.flush();

      if (result.success) {
        res.status(200).json({ status: 'ok', trace });
      } else {
        res.status(500).json({ error: result.error.message, trace });
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

    // Metadata endpoints
    this.app.get('/meta/business-rules', (req: Request, res: Response) => {
      res.json([
        { name: 'Strike rule', enforced: true, condition: 'First roll in frame = 10', score: '10 + next two rolls' },
        { name: 'Spare rule', enforced: true, condition: 'First + Second roll = 10', score: '10 + next one roll' },
        { name: 'Open frame rule', enforced: true, condition: 'First + Second roll < 10', score: 'Sum of rolls' },
        { name: '10th frame bonus rolls', enforced: true, condition: 'Strike or Spare in frame 10', score: 'Up to 3 rolls allowed' },
        { name: 'Pin count validation', enforced: true, condition: 'Roll pins must be integer 0-10', note: 'Validated at API boundary' },
        { name: 'Player name validation', enforced: true, condition: 'Alphanumeric, 1-50 chars, max 4 players', note: 'Sanitized at API boundary' },
        { name: 'Turn order', enforced: false, condition: 'Players alternate per frame', gap: 'Demo mode — turn order relaxed' },
        { name: 'Lane capacity', enforced: true, condition: 'One game per lane' },
        { name: 'Game completion detection', enforced: true, condition: 'Checks all players finish 10 frames' },
        { name: 'Player registration rollback', enforced: false, condition: 'Remove players if booking fails', gap: 'Players persist even if lane assignment fails' },
        { name: 'Lane Switching', enforced: true, condition: 'Move active game to new lane' }
      ]);
    });

    this.app.get('/meta/use-cases', (req: Request, res: Response) => {
      res.json([
        {
          id: 'UC0',
          level: 'SUMMARY LEVEL',
          name: 'RUN A BOWLING SESSION',
          scope: 'Bowling Alley System (all 4 hexagons)',
          actor: 'Front Desk Attendant',
          scenario: [
            'Attendant submits player names for a new game',
            'Player Registry creates a record per player [AI decision: shoe size hardcoded to 10]',
            'Lane Manager finds first available lane, marks it in-use',
            'Scoring Engine initializes game with empty roll arrays',
            'Bowler rolls — Attendant records pin count',
            'Scoring Engine calculates frames (strike/spare/open)',
            'Attendant views scoreboard at any time',
            'Game auto-completes when all players finish 10 frames'
          ],
          businessRules: [
            'Player identity scheme (UUID-based)',
            'Shoe size as required field, hardcoded by orchestrator',
            'Lane assignment strategy (first-available sequential)',
            'Result<T,E> monad error model (no exceptions)',
            'In-memory persistence (dies with restart)'
          ]
        },
        {
          id: 'UC1',
          level: 'USER GOAL LEVEL',
          name: 'BOOK GAME',
          actor: 'Front Desk Attendant',
          goal: 'Start a new bowling game for a group of players',
          scope: 'Front Desk hexagon (orchestrates 3 others)',
          preconditions: ['At least one lane is available', '1-4 player names provided'],
          success: 'Game created, lane reserved, all players registered',
          scenario: [
            'Attendant submits player names via POST /games',
            'Front Desk calls Player Registry for each name',
            'Player Registry creates player record, returns ID',
            'Front Desk calls Lane Manager to assign a lane',
            'Lane Manager finds first available lane, marks in-use',
            'Front Desk calls Scoring Engine to initialize game',
            'Scoring Engine creates game state with player IDs and lane',
            'Front Desk returns game confirmation (game ID, lane, player IDs)'
          ]
        },
        {
          id: 'UC4',
          level: 'USER GOAL LEVEL',
          name: 'SWITCH LANE',
          actor: 'Attendant / Manager',
          goal: 'Move active game to a different lane (mechanical failure)',
          scope: 'Front Desk → Lane Manager + Scoring Engine',
          preconditions: ['Game exists, another lane is available'],
          success: 'Game moved, old lane released, scores preserved',
          scenario: [
            'Manager requests lane switch for active game',
            'Front Desk gets current game to find old lane ID',
            'Front Desk asks Lane Manager for a new available lane',
            'Lane Manager assigns new lane',
            'Front Desk tells Scoring Engine to update game\'s lane ID',
            'Front Desk tells Lane Manager to release old lane',
            'Game continues on new lane with all scores intact'
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
