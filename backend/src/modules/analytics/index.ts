import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { SimpleEventBus } from '../../infrastructure/eventBus';
import { authenticate, authorize } from '../../infrastructure/auth';
import { EVENTS, PaymentCompletedPayload } from '../../shared/events';

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
}

class AnalyticsService {
  constructor(
    private repo: AnalyticsRepository,
    private eventBus: SimpleEventBus
  ) {}

  async getDailyRevenue(date: string): Promise<{ date: string; total: number }> {
    const total = await this.repo.getDailyRevenue(date);
    return { date, total };
  }

  registerEventHandlers(): void {
    this.eventBus.subscribe(EVENTS.PAYMENT_COMPLETED, async (raw) => {
      const payload = raw as PaymentCompletedPayload;
      console.log(`[Analytics] PAYMENT_COMPLETED → recording revenue ${payload.amount} on ${payload.date}`);
      await this.repo.saveRevenue(payload.billId, payload.amount, payload.date);
    });
  }
}

export function registerAnalyticsModule(db: Pool, eventBus: SimpleEventBus): Router {
  const router  = Router();
  const repo    = new AnalyticsRepository(db);
  const service = new AnalyticsService(repo, eventBus);

  service.registerEventHandlers();

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

  return router;
}
