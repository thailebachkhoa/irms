// src/modules/billing/index.ts
// Module Billing & Payment

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { SimpleEventBus } from '../../infrastructure/eventBus';
import { authenticate, authorize } from '../../infrastructure/auth';
import {
  EVENTS,
  OrderCompletedPayload,
  PaymentCompletedPayload,
} from '../../shared/events';

// ─── Models ───────────────────────────────────────────────
interface Bill {
  id: string;
  orderId: string;
  tableId: string;
  totalAmount: number;
  status: 'pending' | 'paid';
  createdAt: string;
}

// ─── Repository ───────────────────────────────────────────
class BillingRepository {
  constructor(private db: Pool) {}

  async createBill(orderId: string, tableId: string, totalAmount: number): Promise<Bill> {
    // Nếu bill cho order này đã tồn tại (idempotent), trả về cái cũ
    const existing = await this.db.query(
      `SELECT id, order_id AS "orderId", table_id AS "tableId",
              total_amount AS "totalAmount", status, created_at AS "createdAt"
       FROM bills WHERE order_id = $1 AND status = 'pending'`,
      [orderId]
    );
    if (existing.rows[0]) return existing.rows[0];

    const { rows } = await this.db.query(
      `INSERT INTO bills (order_id, table_id, total_amount, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id, order_id AS "orderId", table_id AS "tableId",
                 total_amount AS "totalAmount", status, created_at AS "createdAt"`,
      [orderId, tableId, totalAmount]
    );
    return rows[0];
  }

  async findPendingByTable(tableId: string): Promise<Bill | null> {
    const { rows } = await this.db.query(
      `SELECT b.id, b.order_id AS "orderId", b.table_id AS "tableId",
              b.total_amount AS "totalAmount", b.status, b.created_at AS "createdAt"
       FROM bills b
       WHERE b.table_id = $1 AND b.status = 'pending'
       ORDER BY b.created_at DESC LIMIT 1`,
      [tableId]
    );
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<Bill | null> {
    const { rows } = await this.db.query(
      `SELECT id, order_id AS "orderId", table_id AS "tableId",
              total_amount AS "totalAmount", status, created_at AS "createdAt"
       FROM bills WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async markPaid(id: string): Promise<Bill | null> {
    const { rows } = await this.db.query(
      `UPDATE bills SET status = 'paid' WHERE id = $1
       RETURNING id, order_id AS "orderId", table_id AS "tableId",
                 total_amount AS "totalAmount", status, created_at AS "createdAt"`,
      [id]
    );
    return rows[0] ?? null;
  }

  // Lấy total_price từ order để tạo bill khi nhận event
  async getOrderTotalPrice(orderId: string): Promise<{ totalPrice: number; tableId: string } | null> {
    const { rows } = await this.db.query(
      `SELECT total_price AS "totalPrice", table_id AS "tableId"
       FROM orders WHERE id = $1`,
      [orderId]
    );
    return rows[0] ?? null;
  }
}

// ─── Service ──────────────────────────────────────────────
class BillingService {
  constructor(
    private repo: BillingRepository,
    private eventBus: SimpleEventBus
  ) {}

  async getBillByTable(tableId: string): Promise<Bill | null> {
    return this.repo.findPendingByTable(tableId);
  }

  async pay(billId: string): Promise<Bill> {
    const bill = await this.repo.markPaid(billId);
    if (!bill) throw new Error(`Bill ${billId} not found or already paid`);

    const payload: PaymentCompletedPayload = {
      billId:  bill.id,
      tableId: bill.tableId,
      amount:  bill.totalAmount,
      date:    new Date().toISOString().slice(0, 10),
    };
    await this.eventBus.publish(EVENTS.PAYMENT_COMPLETED, payload);

    return bill;
  }

  registerEventHandlers(): void {
    // ORDER_COMPLETED → tạo bill sẵn cho thu ngân
    this.eventBus.subscribe(EVENTS.ORDER_COMPLETED, async (raw) => {
      const payload = raw as OrderCompletedPayload;
      console.log(`[Billing] ORDER_COMPLETED → creating bill for order ${payload.orderId}`);

      const orderInfo = await this.repo.getOrderTotalPrice(payload.orderId);
      if (!orderInfo) {
        console.error(`[Billing] Order ${payload.orderId} not found`);
        return;
      }
      await this.repo.createBill(payload.orderId, orderInfo.tableId, orderInfo.totalPrice);
    });
  }
}

// ─── Controller / Router ──────────────────────────────────
export function registerBillingModule(db: Pool, eventBus: SimpleEventBus): Router {
  const router  = Router();
  const repo    = new BillingRepository(db);
  const service = new BillingService(repo, eventBus);

  service.registerEventHandlers();

  // GET /billing/:tableId — casher, manager, admin
  router.get('/billing/:tableId',
    authenticate, authorize('casher', 'manager', 'admin'),
    async (req: Request, res: Response) => {
      try {
        const bill = await service.getBillByTable(req.params.tableId);
        if (!bill) {
          res.status(404).json({ error: 'No pending bill for this table' });
          return;
        }
        res.json(bill);
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  // POST /billing/:billId/pay — casher, manager, admin
  router.post('/billing/:billId/pay',
    authenticate, authorize('casher', 'manager', 'admin'),
    async (req: Request, res: Response) => {
      try {
        res.json(await service.pay(req.params.billId));
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );

  return router;
}
