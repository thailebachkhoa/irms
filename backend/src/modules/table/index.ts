import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { SimpleEventBus } from '../../infrastructure/eventBus';
import { authenticate, authorize } from '../../infrastructure/auth';
import {
  EVENTS,
  OrderCreatedPayload,
  OrderCompletedPayload,
  PaymentCompletedPayload,
} from '../../shared/events';

type TableStatus = 'available' | 'occupied' | 'food_ready';

interface Table {
  id: string;
  tableNumber: string;
  status: TableStatus;
}

class TableRepository {
  constructor(private db: Pool) {}

  async findAll(): Promise<Table[]> {
    const { rows } = await this.db.query(
      `SELECT id, table_number AS "tableNumber", status FROM tables ORDER BY table_number`
    );
    return rows;
  }

  async updateStatusByNumber(tableNumber: string, status: TableStatus): Promise<void> {
    await this.db.query(
      `INSERT INTO tables (table_number, status) VALUES ($1, $2)
       ON CONFLICT (table_number) DO UPDATE SET status = $2`,
      [tableNumber, status]
    );
  }
}

class TableService {
  constructor(
    private repo: TableRepository,
    private eventBus: SimpleEventBus
  ) {}

  async getAllTables(): Promise<Table[]> {
    return this.repo.findAll();
  }

  registerEventHandlers(): void {
    this.eventBus.subscribe(EVENTS.ORDER_CREATED, async (raw) => {
      const payload = raw as OrderCreatedPayload;
      console.log(`[Table] ORDER_CREATED → table ${payload.tableId} → occupied`);
      await this.repo.updateStatusByNumber(payload.tableId, 'occupied');
    });

    this.eventBus.subscribe(EVENTS.ORDER_COMPLETED, async (raw) => {
      const payload = raw as OrderCompletedPayload;
      console.log(`[Table] ORDER_COMPLETED → table ${payload.tableId} → food_ready`);
      await this.repo.updateStatusByNumber(payload.tableId, 'food_ready');
    });

    this.eventBus.subscribe(EVENTS.PAYMENT_COMPLETED, async (raw) => {
      const payload = raw as PaymentCompletedPayload;
      console.log(`[Table] PAYMENT_COMPLETED → table ${payload.tableId} → available`);
      await this.repo.updateStatusByNumber(payload.tableId, 'available');
    });
  }
}

export function registerTableModule(db: Pool, eventBus: SimpleEventBus): Router {
  const router  = Router();
  const repo    = new TableRepository(db);
  const service = new TableService(repo, eventBus);

  service.registerEventHandlers();

  router.get('/tables',
    authenticate, authorize('server', 'manager', 'admin', 'casher'),
    async (_req: Request, res: Response) => {
      try {
        res.json(await service.getAllTables());
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  return router;
}
