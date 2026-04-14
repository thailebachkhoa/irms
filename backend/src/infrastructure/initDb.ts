// src/infrastructure/initDb.ts
// Chạy một lần để tạo bảng + seed data mẫu
// Lệnh: npm run db:init

import { pool } from './db';
import bcrypt from 'bcryptjs';

async function initDb() {
  const client = await pool.connect();
  try {
    console.log('[InitDB] Creating tables...');

    await client.query(`
      -- Extensions
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- Users
      CREATE TABLE IF NOT EXISTS users (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username   VARCHAR(50) UNIQUE NOT NULL,
        password   TEXT NOT NULL,
        role       VARCHAR(20) NOT NULL CHECK (role IN ('admin','manager','server','chef','casher')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Menu items (combo)
      CREATE TABLE IF NOT EXISTS menu_items (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name         VARCHAR(100) NOT NULL,
        price        INTEGER NOT NULL,
        is_available BOOLEAN DEFAULT TRUE,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );

      -- Dishes (món ăn trong combo)
      CREATE TABLE IF NOT EXISTS dishes (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name           VARCHAR(100) NOT NULL,
        category       VARCHAR(50),
        cooking_method VARCHAR(50)
      );

      -- Combo → Dish mapping
      CREATE TABLE IF NOT EXISTS combo_dishes (
        combo_id  UUID REFERENCES menu_items(id) ON DELETE CASCADE,
        dish_id   UUID REFERENCES dishes(id)     ON DELETE CASCADE,
        PRIMARY KEY (combo_id, dish_id)
      );

      -- Ingredients (nguyên liệu kho)
      CREATE TABLE IF NOT EXISTS ingredients (
        id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name      VARCHAR(100) UNIQUE NOT NULL,
        quantity  NUMERIC(10,2) NOT NULL DEFAULT 0,
        unit      VARCHAR(20) NOT NULL,
        threshold NUMERIC(10,2) NOT NULL DEFAULT 0
      );

      -- Dish → Ingredient mapping
      CREATE TABLE IF NOT EXISTS dish_ingredients (
        dish_id         UUID REFERENCES dishes(id) ON DELETE CASCADE,
        ingredient_name VARCHAR(100) NOT NULL,
        qty_needed      NUMERIC(10,2) NOT NULL,
        unit            VARCHAR(20)   NOT NULL,
        PRIMARY KEY (dish_id, ingredient_name)
      );

      -- Tables (bàn ăn)
      CREATE TABLE IF NOT EXISTS tables (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_number VARCHAR(10) UNIQUE NOT NULL,
        status       VARCHAR(20) DEFAULT 'available'
                     CHECK (status IN ('available','occupied','food_ready'))
      );

      -- Orders
      CREATE TABLE IF NOT EXISTS orders (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_id    VARCHAR(20) NOT NULL,
        combo_id    UUID REFERENCES menu_items(id),
        combo_name  VARCHAR(100) NOT NULL,
        quantity    INTEGER NOT NULL DEFAULT 1,
        notes       TEXT DEFAULT '',
        total_price INTEGER NOT NULL,
        status      VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','cooking','done')),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      -- Kitchen tickets
      CREATE TABLE IF NOT EXISTS kitchen_tickets (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
        table_id   VARCHAR(20) NOT NULL,
        combo_name VARCHAR(100) NOT NULL,
        quantity   INTEGER NOT NULL,
        notes      TEXT DEFAULT '',
        status     VARCHAR(20) DEFAULT 'pending'
                   CHECK (status IN ('pending','cooking','done')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Bills
      CREATE TABLE IF NOT EXISTS bills (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id     UUID REFERENCES orders(id),
        table_id     VARCHAR(20) NOT NULL,
        total_amount INTEGER NOT NULL,
        status       VARCHAR(20) DEFAULT 'pending'
                     CHECK (status IN ('pending','paid')),
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );

      -- Revenue records
      CREATE TABLE IF NOT EXISTS revenues (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bill_id    UUID REFERENCES bills(id),
        amount     INTEGER NOT NULL,
        date       DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('[InitDB] Tables created. Seeding data...');

    // ── Seed users ────────────────────────────────────────
    const adminHash   = await bcrypt.hash('admin123',   10);
    const managerHash = await bcrypt.hash('manager123', 10);
    const serverHash  = await bcrypt.hash('server123',  10);
    const chefHash    = await bcrypt.hash('chef123',    10);
    const casherHash  = await bcrypt.hash('casher123',  10);

    await client.query(`
      INSERT INTO users (username, password, role) VALUES
        ('admin',   $1, 'admin'),
        ('manager', $2, 'manager'),
        ('server1', $3, 'server'),
        ('chef1',   $4, 'chef'),
        ('casher1', $5, 'casher')
      ON CONFLICT (username) DO NOTHING;
    `, [adminHash, managerHash, serverHash, chefHash, casherHash]);

    // ── Seed menu items ───────────────────────────────────
    await client.query(`
      INSERT INTO menu_items (id, name, price, is_available) VALUES
        ('a1b2c3d4-0000-0000-0000-000000000001', 'Combo Gà Hàn Quốc',      130000, true),
        ('a1b2c3d4-0000-0000-0000-000000000002', 'Combo Gogi Bò Nướng',    180000, true),
        ('a1b2c3d4-0000-0000-0000-000000000003', 'Combo Phở Đặc Biệt',      95000, true),
        ('a1b2c3d4-0000-0000-0000-000000000004', 'Combo Trẻ Em Khuyến Mãi', 65000, true),
        ('a1b2c3d4-0000-0000-0000-000000000005', 'Combo Hải Sản Cao Cấp',  250000, true),
        ('a1b2c3d4-0000-0000-0000-000000000006', 'Combo Chay Thanh Đạm',    80000, true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // ── Seed tables ───────────────────────────────────────
    await client.query(`
      INSERT INTO tables (table_number, status) VALUES
        ('001', 'available'), ('002', 'available'), ('003', 'available'),
        ('004', 'available'), ('005', 'available'), ('006', 'available'),
        ('007', 'available'), ('008', 'available'), ('009', 'available'),
        ('010', 'available')
      ON CONFLICT (table_number) DO NOTHING;
    `);

    // ── Seed ingredients ──────────────────────────────────
    await client.query(`
      INSERT INTO ingredients (name, quantity, unit, threshold) VALUES
        ('Gà',        50,    'kg',  10),
        ('Bò',        30,    'kg',   8),
        ('Rau muống', 100,   'bó',  20),
        ('Dầu ăn',    20000, 'ml', 3000),
        ('Tỏi',       5000,  'g',  500),
        ('Hành',      3000,  'g',  400),
        ('Bún/Phở',   80,    'kg',  15),
        ('Xương hầm', 25,    'kg',   5),
        ('Tôm',       20,    'kg',   5),
        ('Mực',       15,    'kg',   4),
        ('Rau cải',   60,    'bó',  10),
        ('Đậu hũ',    40,    'kg',   8),
        ('Nước mắm',  10000, 'ml', 1000),
        ('Muối',      5000,  'g',  500),
        ('Đường',     3000,  'g',  300)
      ON CONFLICT (name) DO NOTHING;
    `);

    // ── Seed dishes ───────────────────────────────────────
    await client.query(`
      INSERT INTO dishes (id, name, category, cooking_method) VALUES
        ('d0000001-0000-0000-0000-000000000001', 'Gà chiên Hàn Quốc',   'mặn',  'chiên'),
        ('d0000001-0000-0000-0000-000000000002', 'Rau muống xào tỏi',   'mặn',  'xào'),
        ('d0000001-0000-0000-0000-000000000003', 'Cơm trắng',           'mặn',  'hấp'),
        ('d0000002-0000-0000-0000-000000000001', 'Bò nướng Gogi',       'mặn',  'nướng'),
        ('d0000002-0000-0000-0000-000000000002', 'Rau cải xào',         'mặn',  'xào'),
        ('d0000003-0000-0000-0000-000000000001', 'Phở bò đặc biệt',     'mặn',  'luộc'),
        ('d0000004-0000-0000-0000-000000000001', 'Cơm gà trẻ em',       'mặn',  'chiên'),
        ('d0000005-0000-0000-0000-000000000001', 'Tôm hấp bia',         'mặn',  'hấp'),
        ('d0000005-0000-0000-0000-000000000002', 'Mực xào sa tế',       'mặn',  'xào'),
        ('d0000006-0000-0000-0000-000000000001', 'Đậu hũ sốt cà',       'chay', 'xào'),
        ('d0000006-0000-0000-0000-000000000002', 'Rau cải luộc',        'chay', 'luộc')
      ON CONFLICT (id) DO NOTHING;
    `);

    // ── Seed combo_dishes ─────────────────────────────────
    await client.query(`
      INSERT INTO combo_dishes (combo_id, dish_id) VALUES
        -- Combo Gà Hàn Quốc
        ('a1b2c3d4-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001'),
        ('a1b2c3d4-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000002'),
        ('a1b2c3d4-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000003'),
        -- Combo Gogi Bò Nướng
        ('a1b2c3d4-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000001'),
        ('a1b2c3d4-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002'),
        ('a1b2c3d4-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000003'),
        -- Combo Phở Đặc Biệt
        ('a1b2c3d4-0000-0000-0000-000000000003', 'd0000003-0000-0000-0000-000000000001'),
        -- Combo Trẻ Em
        ('a1b2c3d4-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000001'),
        ('a1b2c3d4-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000003'),
        -- Combo Hải Sản
        ('a1b2c3d4-0000-0000-0000-000000000005', 'd0000005-0000-0000-0000-000000000001'),
        ('a1b2c3d4-0000-0000-0000-000000000005', 'd0000005-0000-0000-0000-000000000002'),
        ('a1b2c3d4-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000003'),
        -- Combo Chay
        ('a1b2c3d4-0000-0000-0000-000000000006', 'd0000006-0000-0000-0000-000000000001'),
        ('a1b2c3d4-0000-0000-0000-000000000006', 'd0000006-0000-0000-0000-000000000002'),
        ('a1b2c3d4-0000-0000-0000-000000000006', 'd0000001-0000-0000-0000-000000000003')
      ON CONFLICT DO NOTHING;
    `);

    // ── Seed dish_ingredients ─────────────────────────────
    await client.query(`
      INSERT INTO dish_ingredients (dish_id, ingredient_name, qty_needed, unit) VALUES
        -- Gà chiên Hàn Quốc
        ('d0000001-0000-0000-0000-000000000001', 'Gà',      0.3,  'kg'),
        ('d0000001-0000-0000-0000-000000000001', 'Dầu ăn',  200,  'ml'),
        ('d0000001-0000-0000-0000-000000000001', 'Tỏi',     20,   'g'),
        -- Rau muống xào tỏi
        ('d0000001-0000-0000-0000-000000000002', 'Rau muống', 1,  'bó'),
        ('d0000001-0000-0000-0000-000000000002', 'Tỏi',       15, 'g'),
        ('d0000001-0000-0000-0000-000000000002', 'Dầu ăn',    50, 'ml'),
        -- Cơm trắng
        ('d0000001-0000-0000-0000-000000000003', 'Muối',  5, 'g'),
        -- Bò nướng Gogi
        ('d0000002-0000-0000-0000-000000000001', 'Bò',      0.35, 'kg'),
        ('d0000002-0000-0000-0000-000000000001', 'Hành',    30,   'g'),
        ('d0000002-0000-0000-0000-000000000001', 'Nước mắm',30,   'ml'),
        -- Rau cải xào
        ('d0000002-0000-0000-0000-000000000002', 'Rau cải', 1,    'bó'),
        ('d0000002-0000-0000-0000-000000000002', 'Dầu ăn',  50,   'ml'),
        -- Phở bò
        ('d0000003-0000-0000-0000-000000000001', 'Bò',       0.2, 'kg'),
        ('d0000003-0000-0000-0000-000000000001', 'Bún/Phở',  0.1, 'kg'),
        ('d0000003-0000-0000-0000-000000000001', 'Xương hầm',0.3, 'kg'),
        ('d0000003-0000-0000-0000-000000000001', 'Hành',     20,  'g'),
        -- Cơm gà trẻ em
        ('d0000004-0000-0000-0000-000000000001', 'Gà',      0.15, 'kg'),
        ('d0000004-0000-0000-0000-000000000001', 'Dầu ăn',  100,  'ml'),
        -- Tôm hấp bia
        ('d0000005-0000-0000-0000-000000000001', 'Tôm',     0.3, 'kg'),
        ('d0000005-0000-0000-0000-000000000001', 'Hành',    10,  'g'),
        -- Mực xào sa tế
        ('d0000005-0000-0000-0000-000000000002', 'Mực',     0.25, 'kg'),
        ('d0000005-0000-0000-0000-000000000002', 'Dầu ăn',  80,   'ml'),
        ('d0000005-0000-0000-0000-000000000002', 'Tỏi',     15,   'g'),
        -- Đậu hũ sốt cà
        ('d0000006-0000-0000-0000-000000000001', 'Đậu hũ',  0.2, 'kg'),
        ('d0000006-0000-0000-0000-000000000001', 'Dầu ăn',  60,  'ml'),
        -- Rau cải luộc
        ('d0000006-0000-0000-0000-000000000002', 'Rau cải', 1,   'bó'),
        ('d0000006-0000-0000-0000-000000000002', 'Muối',    5,   'g')
      ON CONFLICT DO NOTHING;
    `);

    console.log('[InitDB] ✅ Done! Default accounts:');
    console.log('  admin   / admin123');
    console.log('  manager / manager123');
    console.log('  server1 / server123');
    console.log('  chef1   / chef123');
    console.log('  casher1 / casher123');

  } finally {
    client.release();
    await pool.end();
  }
}

initDb().catch(err => {
  console.error('[InitDB] FAILED:', err);
  process.exit(1);
});