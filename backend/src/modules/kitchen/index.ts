import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { SimpleEventBus } from '../../infrastructure/eventBus';
import { authenticate, authorize } from '../../infrastructure/auth';
import { EVENTS, OrderCreatedPayload, OrderCompletedPayload } from '../../shared/events';

interface KitchenTicket {
  id: string;
  orderId: string;
  tableId: string;
  comboName: string;
  quantity: number;
  notes: string;
  status: 'pending' | 'cooking' | 'done';
  createdAt: string;
}

class KitchenRepository {
  constructor(private db: Pool) {}

  async saveTicket(payload: OrderCreatedPayload): Promise<KitchenTicket> {
    const { rows } = await this.db.query(
      `INSERT INTO kitchen_tickets (order_id, table_id, combo_name, quantity, notes, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, order_id AS "orderId", table_id AS "tableId",
                 combo_name AS "comboName", quantity, notes, status,
                 created_at AS "createdAt"`,
      [payload.orderId, payload.tableId, payload.comboName, payload.quantity, payload.notes]
    );
    return rows[0];
  }

  async getActiveTickets(): Promise<KitchenTicket[]> {
    const { rows } = await this.db.query(
      `SELECT id, order_id AS "orderId", table_id AS "tableId",
              combo_name AS "comboName", quantity, notes, status,
              created_at AS "createdAt"
       FROM kitchen_tickets
       WHERE status IN ('pending', 'cooking')
       ORDER BY created_at ASC`
    );
    return rows;
  }

  async updateStatus(id: string, status: KitchenTicket['status']): Promise<KitchenTicket | null> {
    const { rows } = await this.db.query(
      `UPDATE kitchen_tickets SET status = $1 WHERE id = $2
       RETURNING id, order_id AS "orderId", table_id AS "tableId",
                 combo_name AS "comboName", quantity, notes, status,
                 created_at AS "createdAt"`,
      [status, id]
    );
    return rows[0] ?? null;
  }

  async updateOrderStatus(orderId: string, status: 'cooking' | 'done'): Promise<void> {
    await this.db.query(
      `UPDATE orders SET status = $1 WHERE id = $2`,
      [status, orderId]
    );
  }
}

class KitchenService {
  constructor(
    private repo: KitchenRepository,
    private eventBus: SimpleEventBus
  ) {}

  async getActiveTickets(): Promise<KitchenTicket[]> {
    return this.repo.getActiveTickets();
  }

  async startCooking(id: string): Promise<KitchenTicket> {
    const ticket = await this.repo.updateStatus(id, 'cooking');
    if (!ticket) throw new Error(`Ticket ${id} not found`);
    await this.repo.updateOrderStatus(ticket.orderId, 'cooking');
    return ticket;
  }

  async markDone(id: string): Promise<KitchenTicket> {
    const ticket = await this.repo.updateStatus(id, 'done');
    if (!ticket) throw new Error(`Ticket ${id} not found`);

    const payload: OrderCompletedPayload = {
      orderId: ticket.orderId,
      tableId: ticket.tableId,
    };
    await this.eventBus.publish(EVENTS.ORDER_COMPLETED, payload);

    return ticket;
  }

  registerEventHandlers(): void {
    this.eventBus.subscribe(EVENTS.ORDER_CREATED, async (raw) => {
      const payload = raw as OrderCreatedPayload;
      console.log(`[Kitchen] ORDER_CREATED → creating ticket for order ${payload.orderId}`);
      await this.repo.saveTicket(payload);
    });
  }
}

export function registerKitchenModule(db: Pool, eventBus: SimpleEventBus): Router {
  const router  = Router();
  const repo    = new KitchenRepository(db);
  const service = new KitchenService(repo, eventBus);

  service.registerEventHandlers();

  router.get('/kitchen/tickets',
    authenticate, authorize('chef', 'manager', 'admin'),
    async (_req: Request, res: Response) => {
      try {
        res.json(await service.getActiveTickets());
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  router.patch('/kitchen/:id/start',
    authenticate, authorize('chef', 'manager', 'admin'),
    async (req: Request, res: Response) => {
      try {
        res.json(await service.startCooking(req.params.id));
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );

  router.patch('/kitchen/:id/done',
    authenticate, authorize('chef', 'manager', 'admin'),
    async (req: Request, res: Response) => {
      try {
        res.json(await service.markDone(req.params.id));
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );

  return router;
}