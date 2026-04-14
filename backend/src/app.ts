// be/src/app.ts
// Composition root — nối tất cả module lại

import express from 'express';
import cors from 'cors';
import { pool } from './infrastructure/db';
import { SimpleEventBus } from './infrastructure/eventBus';

// Modules
import { registerOrderModule }     from './modules/order';
import { registerKitchenModule }   from './modules/kitchen';
import { registerTableModule }     from './modules/table';
import { registerBillingModule }   from './modules/billing';
import { registerInventoryModule } from './modules/inventory';
import { registerAnalyticsModule } from './modules/analytics';

async function bootstrap() {
  const app      = express();
  const eventBus = new SimpleEventBus();
  const PORT     = parseInt(process.env.PORT || '3000');

  // ── Middleware ──────────────────────────────────────────
  app.use(cors({
    origin: [
      'http://localhost:5173',  // Vite dev
      'http://localhost:4173',  // Vite preview
      'http://localhost:3001',  // alternate
    ],
    credentials: true,
  }));
  app.use(express.json());

  // Request logger (dev)
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // ── QUAN TRỌNG: Thứ tự đăng ký module ──────────────────
  // Subscriber phải đăng ký TRƯỚC publisher để không bỏ lỡ event
  //
  //  ORDER_CREATED  → Kitchen, Table, Inventory cần lắng nghe
  //  ORDER_COMPLETED→ Billing, Table cần lắng nghe
  //  PAYMENT_COMPLETED → Table, Analytics cần lắng nghe
  //  RAW_MATERIAL_LOW  → Order (menu) cần lắng nghe
  //
  // Thứ tự: Kitchen → Table → Billing → Inventory → Analytics → Order

  app.use('/api', registerKitchenModule(pool, eventBus));   // lắng nghe ORDER_CREATED
  app.use('/api', registerTableModule(pool, eventBus));     // lắng nghe ORDER_CREATED, ORDER_COMPLETED, PAYMENT_COMPLETED
  app.use('/api', registerBillingModule(pool, eventBus));   // lắng nghe ORDER_COMPLETED; phát PAYMENT_COMPLETED
  app.use('/api', registerInventoryModule(pool, eventBus)); // lắng nghe ORDER_CREATED; phát RAW_MATERIAL_LOW
  app.use('/api', registerAnalyticsModule(pool, eventBus)); // lắng nghe PAYMENT_COMPLETED; xử lý auth
  app.use('/api', registerOrderModule(pool, eventBus));     // phát ORDER_CREATED; lắng nghe RAW_MATERIAL_LOW

  // ── Health check ────────────────────────────────────────
  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'error', db: 'disconnected' });
    }
  });

  // ── 404 handler ─────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // ── Global error handler ────────────────────────────────
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[App] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // ── Start ───────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`\n🍽️  IRMS Backend running on http://localhost:${PORT}`);
    console.log(`📋  API base: http://localhost:${PORT}/api`);
    console.log(`❤️  Health:   http://localhost:${PORT}/health\n`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[App] SIGTERM received, closing pool...');
    await pool.end();
    process.exit(0);
  });
}

bootstrap().catch(err => {
  console.error('[App] Failed to start:', err);
  process.exit(1);
});
