// src/modules/inventory/index.ts
// Module Inventory — kho nguyên liệu

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { SimpleEventBus } from '../../infrastructure/eventBus';
import { authenticate, authorize } from '../../infrastructure/auth';
import { EVENTS, OrderCreatedPayload, RawMaterialLowPayload } from '../../shared/events';

// ─── Models ───────────────────────────────────────────────
interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  threshold: number;
}

// ─── Repository ───────────────────────────────────────────
class InventoryRepository {
  constructor(private db: Pool) {}

  async findAll(): Promise<Ingredient[]> {
    const { rows } = await this.db.query(
      `SELECT id, name, quantity, unit, threshold FROM ingredients ORDER BY name`
    );
    return rows;
  }

  async updateQuantity(name: string, quantity: number): Promise<Ingredient | null> {
    const { rows } = await this.db.query(
      `UPDATE ingredients SET quantity = $1 WHERE name = $2
       RETURNING id, name, quantity, unit, threshold`,
      [quantity, name]
    );
    return rows[0] ?? null;
  }

  // Trừ nguyên liệu khi có ORDER_CREATED
  // Lấy danh sách nguyên liệu cần cho combo (qua combo_dishes → dish_ingredients)
  async deductForCombo(comboId: string, comboQuantity: number): Promise<void> {
    // Lấy tất cả nguyên liệu cần cho combo này
    const { rows } = await this.db.query(
      `SELECT di.ingredient_name, SUM(di.qty_needed * $2) AS total_needed
       FROM combo_dishes cd
       JOIN dish_ingredients di ON di.dish_id = cd.dish_id
       WHERE cd.combo_id = $1
       GROUP BY di.ingredient_name`,
      [comboId, comboQuantity]
    );

    for (const row of rows) {
      await this.db.query(
        `UPDATE ingredients
         SET quantity = GREATEST(0, quantity - $1)
         WHERE name = $2`,
        [row.total_needed, row.ingredient_name]
      );
    }
  }

  // Tìm nguyên liệu dưới ngưỡng sau khi trừ
  async findBelowThreshold(): Promise<Ingredient[]> {
    const { rows } = await this.db.query(
      `SELECT id, name, quantity, unit, threshold
       FROM ingredients WHERE quantity <= threshold`
    );
    return rows;
  }

  async findByName(name: string): Promise<Ingredient | null> {
    const { rows } = await this.db.query(
      `SELECT id, name, quantity, unit, threshold
       FROM ingredients WHERE name = $1`,
      [name]
    );
    return rows[0] ?? null;
  }
}

// ─── Service ──────────────────────────────────────────────
class InventoryService {
  constructor(
    private repo: InventoryRepository,
    private eventBus: SimpleEventBus
  ) {}

  async getAll(): Promise<Ingredient[]> {
    return this.repo.findAll();
  }

  async updateQuantity(name: string, quantity: number): Promise<Ingredient | null> {
    return this.repo.updateQuantity(name, quantity);
  }

  registerEventHandlers(): void {
    // ORDER_CREATED → trừ kho, kiểm tra ngưỡng
    this.eventBus.subscribe(EVENTS.ORDER_CREATED, async (raw) => {
      const payload = raw as OrderCreatedPayload;
      console.log(`[Inventory] ORDER_CREATED → deducting for combo ${payload.comboId} x${payload.quantity}`);

      await this.repo.deductForCombo(payload.comboId, payload.quantity);

      // Kiểm tra ngưỡng sau khi trừ
      const lowItems = await this.repo.findBelowThreshold();
      for (const item of lowItems) {
        const lowPayload: RawMaterialLowPayload = {
          ingredientName: item.name,
          currentQty:     item.quantity,
          threshold:      item.threshold,
        };
        console.warn(`[Inventory] LOW STOCK: ${item.name} = ${item.quantity} ${item.unit} (threshold: ${item.threshold})`);
        await this.eventBus.publish(EVENTS.RAW_MATERIAL_LOW, lowPayload);
      }
    });
  }
}

// ─── Controller / Router ──────────────────────────────────
export function registerInventoryModule(db: Pool, eventBus: SimpleEventBus): Router {
  const router  = Router();
  const repo    = new InventoryRepository(db);
  const service = new InventoryService(repo, eventBus);

  service.registerEventHandlers();

  // GET /inventory — manager, admin
  router.get('/inventory',
    authenticate, authorize('manager', 'admin'),
    async (_req: Request, res: Response) => {
      try {
        res.json(await service.getAll());
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  // PATCH /inventory/:name — manager, admin
  router.patch('/inventory/:name',
    authenticate, authorize('manager', 'admin'),
    async (req: Request, res: Response) => {
      try {
        const item = await service.updateQuantity(
          decodeURIComponent(req.params.name),
          req.body.quantity
        );
        if (!item) {
          res.status(404).json({ error: 'Ingredient not found' });
          return;
        }
        res.json(item);
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );

  return router;
}
