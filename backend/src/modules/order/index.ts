// src/modules/order/index.ts
// Module Order & Menu — đầy đủ models, repo, service, controller, router

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { SimpleEventBus } from '../../infrastructure/eventBus';
import { authenticate, authorize } from '../../infrastructure/auth';
import { EVENTS, OrderCreatedPayload } from '../../shared/events';

// ─── Models ───────────────────────────────────────────────
interface MenuItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

interface Order {
  id: string;
  tableId: string;
  comboId: string;
  comboName: string;
  quantity: number;
  notes: string;
  totalPrice: number;
  status: 'pending' | 'cooking' | 'done';
  createdAt: string;
}

interface CreateOrderDto {
  tableId: string;
  comboId: string;
  quantity: number;
  notes: string;
}

// ─── Repository ───────────────────────────────────────────
class MenuRepository {
  constructor(private db: Pool) {}

  async findAll(): Promise<MenuItem[]> {
    const { rows } = await this.db.query(
      `SELECT id, name, price, is_available AS "isAvailable" FROM menu_items ORDER BY name`
    );
    return rows;
  }

  async findById(id: string): Promise<MenuItem | null> {
    const { rows } = await this.db.query(
      `SELECT id, name, price, is_available AS "isAvailable" FROM menu_items WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async setAvailability(id: string, isAvailable: boolean): Promise<void> {
    await this.db.query(
      `UPDATE menu_items SET is_available = $1 WHERE id = $2`,
      [isAvailable, id]
    );
  }

  // Đặt unavailable khi nguyên liệu thiếu
  async setUnavailableByIngredient(ingredientName: string): Promise<void> {
    // Tìm tất cả combo dùng nguyên liệu này (qua dish_ingredients → combo_dishes)
    await this.db.query(`
      UPDATE menu_items SET is_available = false
      WHERE id IN (
        SELECT DISTINCT cd.combo_id
        FROM combo_dishes cd
        JOIN dish_ingredients di ON di.dish_id = cd.dish_id
        WHERE di.ingredient_name = $1
      )
    `, [ingredientName]);
  }
}

class OrderRepository {
  constructor(private db: Pool) {}

  async save(dto: CreateOrderDto, comboName: string, totalPrice: number): Promise<Order> {
    const { rows } = await this.db.query(
      `INSERT INTO orders (table_id, combo_id, combo_name, quantity, notes, total_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, table_id AS "tableId", combo_id AS "comboId",
                 combo_name AS "comboName", quantity, notes,
                 total_price AS "totalPrice", status,
                 created_at AS "createdAt"`,
      [dto.tableId, dto.comboId, comboName, dto.quantity, dto.notes || '', totalPrice]
    );
    return rows[0];
  }

  async findByTable(tableId: string): Promise<Order[]> {
    const { rows } = await this.db.query(
      `SELECT id, table_id AS "tableId", combo_id AS "comboId",
              combo_name AS "comboName", quantity, notes,
              total_price AS "totalPrice", status,
              created_at AS "createdAt"
       FROM orders WHERE table_id = $1 ORDER BY created_at DESC`,
      [tableId]
    );
    return rows;
  }

  async updateStatus(id: string, status: Order['status']): Promise<void> {
    await this.db.query(`UPDATE orders SET status = $1 WHERE id = $2`, [status, id]);
  }
}

// ─── Service ──────────────────────────────────────────────
class OrderService {
  constructor(
    private menuRepo: MenuRepository,
    private orderRepo: OrderRepository,
    private eventBus: SimpleEventBus
  ) {}

  async getMenu(): Promise<MenuItem[]> {
    return this.menuRepo.findAll();
  }

  async setMenuAvailability(id: string, isAvailable: boolean): Promise<void> {
    return this.menuRepo.setAvailability(id, isAvailable);
  }

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const combo = await this.menuRepo.findById(dto.comboId);
    if (!combo) throw new Error(`Combo ${dto.comboId} not found`);
    if (!combo.isAvailable) throw new Error(`Combo "${combo.name}" is not available`);

    const totalPrice = combo.price * dto.quantity;
    const order = await this.orderRepo.save(dto, combo.name, totalPrice);

    // Phát event cho Kitchen, Table, Inventory
    const payload: OrderCreatedPayload = {
      orderId:    order.id,
      tableId:    order.tableId,
      comboId:    order.comboId,
      comboName:  order.comboName,
      quantity:   order.quantity,
      notes:      order.notes,
      totalPrice: order.totalPrice,
    };
    await this.eventBus.publish(EVENTS.ORDER_CREATED, payload);

    return order;
  }

  async getOrdersByTable(tableId: string): Promise<Order[]> {
    return this.orderRepo.findByTable(tableId);
  }

  // Handler: nhận RAW_MATERIAL_LOW từ Inventory
  registerEventHandlers(): void {
    this.eventBus.subscribe(EVENTS.RAW_MATERIAL_LOW, async (raw) => {
      const payload = raw as { ingredientName: string };
      console.log(`[Order] RAW_MATERIAL_LOW → hiding combos with "${payload.ingredientName}"`);
      await this.menuRepo.setUnavailableByIngredient(payload.ingredientName);
    });
  }
}

// ─── Controller / Router ──────────────────────────────────
export function registerOrderModule(db: Pool, eventBus: SimpleEventBus): Router {
  const router     = Router();
  const menuRepo   = new MenuRepository(db);
  const orderRepo  = new OrderRepository(db);
  const service    = new OrderService(menuRepo, orderRepo, eventBus);

  // Đăng ký event listener ngay khi module được load
  service.registerEventHandlers();

  // GET /menu — ai cũng được xem
  router.get('/menu', authenticate, async (_req: Request, res: Response) => {
    try {
      res.json(await service.getMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH /menu/:id/availability — admin/manager
  router.patch('/menu/:id/availability',
    authenticate, authorize('admin', 'manager'),
    async (req: Request, res: Response) => {
      try {
        await service.setMenuAvailability(req.params.id, req.body.isAvailable);
        res.json({ ok: true });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );

  // POST /orders — server, manager, admin
  router.post('/orders',
    authenticate, authorize('server', 'manager', 'admin'),
    async (req: Request, res: Response) => {
      try {
        const order = await service.createOrder(req.body as CreateOrderDto);
        res.status(201).json(order);
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );

  // GET /orders/table/:tableId — server, casher, manager, admin
  router.get('/orders/table/:tableId',
    authenticate, authorize('server', 'casher', 'manager', 'admin'),
    async (req: Request, res: Response) => {
      try {
        res.json(await service.getOrdersByTable(req.params.tableId));
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  return router;
}
