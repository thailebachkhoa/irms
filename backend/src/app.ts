import express from 'express';
import cors from 'cors';
import { pool } from './infrastructure/db';
import { SimpleEventBus } from './infrastructure/eventBus';

import { registerAuthModule }      from './modules/auth';
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

  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:3001',
    ],
    credentials: true,
  }));
  app.use(express.json());

  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  app.use('/api', registerAuthModule(pool));
  app.use('/api', registerKitchenModule(pool, eventBus));
  app.use('/api', registerTableModule(pool, eventBus));
  app.use('/api', registerBillingModule(pool, eventBus));
  app.use('/api', registerInventoryModule(pool, eventBus));
  app.use('/api', registerAnalyticsModule(pool, eventBus));
  app.use('/api', registerOrderModule(pool, eventBus));

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'error', db: 'disconnected' });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[App] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`\n🍽️  IRMS Backend running on http://localhost:${PORT}`);
    console.log(`📋  API base: http://localhost:${PORT}/api`);
    console.log(`❤️  Health:   http://localhost:${PORT}/health\n`);
  });

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
