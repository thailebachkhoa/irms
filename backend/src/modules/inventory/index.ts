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
  async deductForCombo(comboId: string, comboQuantity: number): Promise<void> {
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

  /**
   * Sau khi cập nhật nguyên liệu, duyệt toàn bộ combo đang is_available = false
   * và bật lại những combo mà TẤT CẢ nguyên liệu đều vượt ngưỡng threshold.
   *
   * Logic SQL:
   *  - Lấy tất cả combo đang bị tắt
   *  - Với mỗi combo, kiểm tra xem có nguyên liệu nào còn <= threshold không
   *  - Nếu không có → combo đủ hàng → bật lại is_available = true
   */
  async restoreAvailableCombo(): Promise<string[]> {
    const { rows } = await this.db.query(`
      UPDATE menu_items
      SET is_available = true
      WHERE is_available = false
        AND id NOT IN (
          -- Các combo vẫn còn ít nhất 1 nguyên liệu thiếu (quantity <= threshold)
          SELECT DISTINCT cd.combo_id
          FROM combo_dishes cd
          JOIN dish_ingredients di ON di.dish_id = cd.dish_id
          JOIN ingredients ing     ON ing.name    = di.ingredient_name
          WHERE ing.quantity <= ing.threshold
        )
      RETURNING id, name
    `);

    return rows.map((r: { id: string; name: string }) => r.name);
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

  /**
   * Cập nhật số lượng nguyên liệu, sau đó:
   * 1. Bật lại combo nào vừa đủ nguyên liệu (quantity > threshold với mọi ingredient)
   * 2. Kiểm tra lại ngưỡng — nếu vẫn còn thiếu thì phát RAW_MATERIAL_LOW
   */
  async updateQuantity(name: string, quantity: number): Promise<Ingredient | null> {
    const item = await this.repo.updateQuantity(name, quantity);
    if (!item) return null;

    // Bật lại combo đủ nguyên liệu
    const restored = await this.repo.restoreAvailableCombo();
    if (restored.length > 0) {
      console.log(`[Inventory] Restored available combos: ${restored.join(', ')}`);
    }

    // Nếu nguyên liệu vừa cập nhật vẫn còn dưới ngưỡng → phát cảnh báo tiếp
    if (item.quantity <= item.threshold) {
      const lowPayload: RawMaterialLowPayload = {
        ingredientName: item.name,
        currentQty:     item.quantity,
        threshold:      item.threshold,
      };
      console.warn(`[Inventory] Still LOW after update: ${item.name} = ${item.quantity} ${item.unit}`);
      await this.eventBus.publish(EVENTS.RAW_MATERIAL_LOW, lowPayload);
    }

    return item;
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