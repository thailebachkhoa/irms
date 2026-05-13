// src/modules/analytics/index.ts
// Module Analytics & Admin — doanh thu + quản lý user

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { SimpleEventBus } from '../../infrastructure/eventBus';
import { authenticate, authorize, signToken } from '../../infrastructure/auth';
import { EVENTS, PaymentCompletedPayload } from '../../shared/events';
import type { Role } from '../../infrastructure/auth';

// ─── Models ───────────────────────────────────────────────
interface User {
  id: string;
  username: string;
  role: Role;
  createdAt: string;
}

interface Revenue {
  id: string;
  billId: string;
  amount: number;
  date: string;
}

// ─── Repository ───────────────────────────────────────────
class AnalyticsRepository {
  constructor(private db: Pool) {}

  async saveRevenue(billId: string, amount: number, date: string): Promise<void> {
    await this.db.query(
      `INSERT INTO revenues (bill_id, amount, date) VALUES ($1, $2, $3)`,
      [billId, amount, date]
    );
  }

  async getDailyRevenue(date: string): Promise<number> {
    const { rows } = await this.db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM revenues WHERE date = $1`,
      [date]
    );
    return parseInt(rows[0]?.total ?? '0', 10);
  }

  async findUserByUsername(username: string): Promise<{ id: string; username: string; role: Role; password: string } | null> {
    const { rows } = await this.db.query(
      `SELECT id, username, role, password FROM users WHERE username = $1`,
      [username]
    );
    return rows[0] ?? null;
  }

  async createUser(username: string, hashedPassword: string, role: Role): Promise<User> {
    const { rows } = await this.db.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       RETURNING id, username, role, created_at AS "createdAt"`,
      [username, hashedPassword, role]
    );
    return rows[0];
  }

  async listUsers(): Promise<User[]> {
    const { rows } = await this.db.query(
      `SELECT id, username, role, created_at AS "createdAt" FROM users ORDER BY created_at DESC`
    );
    return rows;
  }
}

// ─── Service ──────────────────────────────────────────────
class AnalyticsService {
  constructor(
    private repo: AnalyticsRepository,
    private eventBus: SimpleEventBus
  ) {}

  async login(username: string, password: string): Promise<string> {
    const user = await this.repo.findUserByUsername(username);
    if (!user) throw new Error('Invalid credentials');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error('Invalid credentials');

    return signToken({ id: user.id, role: user.role });
  }

  async getDailyRevenue(date: string): Promise<{ date: string; total: number }> {
    const total = await this.repo.getDailyRevenue(date);
    return { date, total };
  }

  async createUser(data: { username: string; password: string; role: Role }): Promise<User> {
    const existing = await this.repo.findUserByUsername(data.username);
    if (existing) throw new Error(`Username "${data.username}" already exists`);

    const hashed = await bcrypt.hash(data.password, 10);
    return this.repo.createUser(data.username, hashed, data.role);
  }

  async listUsers(): Promise<User[]> {
    return this.repo.listUsers();
  }

  registerEventHandlers(): void {
    // PAYMENT_COMPLETED → ghi nhận doanh thu
    this.eventBus.subscribe(EVENTS.PAYMENT_COMPLETED, async (raw) => {
      const payload = raw as PaymentCompletedPayload;
      console.log(`[Analytics] PAYMENT_COMPLETED → recording revenue ${payload.amount} on ${payload.date}`);
      await this.repo.saveRevenue(payload.billId, payload.amount, payload.date);
    });
  }
}

// ─── Controller / Router ──────────────────────────────────
export function registerAnalyticsModule(db: Pool, eventBus: SimpleEventBus): Router {
  const router  = Router();
  const repo    = new AnalyticsRepository(db);
  const service = new AnalyticsService(repo, eventBus);

  service.registerEventHandlers();

  // POST /auth/login — public
  router.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: 'username and password required' });
        return;
      }
      const token = await service.login(username, password);
      res.json({ token });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });

  // GET /analytics/revenue?date=YYYY-MM-DD — manager, admin
  router.get('/analytics/revenue',
    authenticate, authorize('manager', 'admin'),
    async (req: Request, res: Response) => {
      try {
        const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
        res.json(await service.getDailyRevenue(date));
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  // POST /analytics/users — admin only
  router.post('/analytics/users',
    authenticate, authorize('admin'),
    async (req: Request, res: Response) => {
      try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) {
          res.status(400).json({ error: 'username, password, role required' });
          return;
        }
        const user = await service.createUser({ username, password, role });
        res.status(201).json(user);
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );

  // GET /analytics/users — admin only
  router.get('/analytics/users',
    authenticate, authorize('admin'),
    async (_req: Request, res: Response) => {
      try {
        res.json(await service.listUsers());
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  return router;
}
