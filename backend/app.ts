
// ════════════════════════════════════════════════════════════
// BACKEND — app.ts (composition root)
// Backend code đầy đủ đã có ở irms-full-skeleton.ts
// Đây chỉ nhắc lại app.ts để thấy FE gọi BE qua /api/*
// ════════════════════════════════════════════════════════════
import express from 'express';
import cors from 'cors';

async function bootstrap() {
    const app = express();
    const eventBus = new SimpleEventBus();

    app.use(cors({ origin: 'http://localhost:5173' })); // Vite dev server
    app.use(express.json());

    // Thứ tự subscriber trước, publisher sau
    app.use('/api', registerKitchenModule(pool, eventBus));
    app.use('/api', registerTableModule(pool, eventBus));
    app.use('/api', registerInventoryModule(pool, eventBus));
    app.use('/api', registerBillingModule(pool, eventBus));
    app.use('/api', registerAnalyticsModule(pool, eventBus));
    app.use('/api', registerOrderModule(pool, eventBus));

    app.listen(3000);
}
bootstrap();