-- ============================================================
-- IRMS — PostgreSQL Setup Script
-- Chạy file này trong psql hoặc pgAdmin để tạo toàn bộ DB
--
-- Cách chạy:
--   psql -U postgres -d irms -f irms.sql
--   hoặc mở pgAdmin → Query Tool → paste vào → F5
--
-- Lưu ý: Tạo database trước:
--   CREATE DATABASE irms;
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. Extensions
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ────────────────────────────────────────────────────────────
-- 1. USERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username   VARCHAR(50) UNIQUE NOT NULL,
  password   TEXT        NOT NULL,   -- bcrypt hash, độ dài cố định ~60 ký tự
  role       VARCHAR(20) NOT NULL
             CHECK (role IN ('admin', 'manager', 'server', 'chef', 'casher')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  users          IS 'Tài khoản nhân viên hệ thống';
COMMENT ON COLUMN users.role     IS 'admin | manager | server | chef | casher';
COMMENT ON COLUMN users.password IS 'bcrypt hash — không lưu plaintext';


-- ────────────────────────────────────────────────────────────
-- 2. MENU ITEMS (combo)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  price        INTEGER      NOT NULL CHECK (price >= 0),  -- VND
  is_available BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE  menu_items              IS 'Danh sách combo bán trong nhà hàng';
COMMENT ON COLUMN menu_items.price        IS 'Giá VND, không có xu';
COMMENT ON COLUMN menu_items.is_available IS 'false khi nguyên liệu thiếu (RAW_MATERIAL_LOW)';


-- ────────────────────────────────────────────────────────────
-- 3. DISHES (món ăn đơn lẻ trong combo)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dishes (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(100) NOT NULL,
  category       VARCHAR(50),   -- ngọt / mặn / á / âu
  cooking_method VARCHAR(50)    -- nướng / xào / chiên / luộc / hầm
);

COMMENT ON TABLE dishes IS 'Món ăn đơn lẻ — được gộp vào combo qua combo_dishes';


-- ────────────────────────────────────────────────────────────
-- 4. COMBO → DISH mapping
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS combo_dishes (
  combo_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  dish_id  UUID REFERENCES dishes(id)     ON DELETE CASCADE,
  PRIMARY KEY (combo_id, dish_id)
);

COMMENT ON TABLE combo_dishes IS 'Mối quan hệ nhiều-nhiều: 1 combo có nhiều dish';


-- ────────────────────────────────────────────────────────────
-- 5. INGREDIENTS (nguyên liệu kho)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingredients (
  id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name      VARCHAR(100)  UNIQUE NOT NULL,
  quantity  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit      VARCHAR(20)   NOT NULL,
  threshold NUMERIC(10,2) NOT NULL DEFAULT 0
            -- khi quantity <= threshold → phát RAW_MATERIAL_LOW
);

COMMENT ON TABLE  ingredients           IS 'Kho nguyên liệu — manager cập nhật thủ công';
COMMENT ON COLUMN ingredients.threshold IS 'Ngưỡng cảnh báo hết hàng';


-- ────────────────────────────────────────────────────────────
-- 6. DISH → INGREDIENT mapping
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dish_ingredients (
  dish_id         UUID          REFERENCES dishes(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(100)  NOT NULL,
  qty_needed      NUMERIC(10,2) NOT NULL CHECK (qty_needed > 0),
  unit            VARCHAR(20)   NOT NULL,
  PRIMARY KEY (dish_id, ingredient_name)
);

COMMENT ON TABLE dish_ingredients IS 'Số lượng nguyên liệu cần để nấu 1 đơn vị dish';


-- ────────────────────────────────────────────────────────────
-- 7. TABLES (bàn ăn)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tables (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number VARCHAR(10) UNIQUE NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'available'
               CHECK (status IN ('available', 'occupied', 'food_ready'))
);

COMMENT ON COLUMN tables.status IS
  'available = trống | occupied = có khách đang nấu | food_ready = món đã ra';


-- ────────────────────────────────────────────────────────────
-- 8. ORDERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id    VARCHAR(20)  NOT NULL,   -- số bàn dạng text vd "001"
  combo_id    UUID         REFERENCES menu_items(id) ON DELETE SET NULL,
  combo_name  VARCHAR(100) NOT NULL,   -- snapshot tên combo tại thời điểm order
  quantity    INTEGER      NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes       TEXT         NOT NULL DEFAULT '',
  total_price INTEGER      NOT NULL CHECK (total_price >= 0),
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'cooking', 'done')),
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_table_id  ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created   ON orders(created_at DESC);

COMMENT ON COLUMN orders.combo_name  IS 'Snapshot tên combo — không bị ảnh hưởng nếu menu đổi sau';
COMMENT ON COLUMN orders.total_price IS 'price * quantity tại thời điểm tạo đơn';


-- ────────────────────────────────────────────────────────────
-- 9. KITCHEN TICKETS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kitchen_tickets (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID         REFERENCES orders(id) ON DELETE CASCADE,
  table_id   VARCHAR(20)  NOT NULL,
  combo_name VARCHAR(100) NOT NULL,
  quantity   INTEGER      NOT NULL CHECK (quantity > 0),
  notes      TEXT         NOT NULL DEFAULT '',
  status     VARCHAR(20)  NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'cooking', 'done')),
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status     ON kitchen_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created    ON kitchen_tickets(created_at ASC);

COMMENT ON TABLE kitchen_tickets IS
  'Được tạo tự động khi ORDER_CREATED — chef xem và cập nhật';


-- ────────────────────────────────────────────────────────────
-- 10. BILLS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID        REFERENCES orders(id) ON DELETE SET NULL,
  table_id     VARCHAR(20) NOT NULL,
  total_amount INTEGER     NOT NULL CHECK (total_amount >= 0),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'paid')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_table_status ON bills(table_id, status);

COMMENT ON TABLE bills IS
  'Được tạo tự động khi ORDER_COMPLETED — casher xác nhận thanh toán';


-- ────────────────────────────────────────────────────────────
-- 11. REVENUES (doanh thu)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenues (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id    UUID        REFERENCES bills(id) ON DELETE SET NULL,
  amount     INTEGER     NOT NULL CHECK (amount >= 0),
  date       DATE        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenues_date ON revenues(date DESC);

COMMENT ON TABLE revenues IS
  'Ghi nhận tự động khi PAYMENT_COMPLETED — manager xem báo cáo doanh thu';


-- ============================================================
-- SEED DATA
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Users (password đã được bcrypt hash sẵn)
-- Plaintext:
--   admin   → admin123
--   manager → manager123
--   server1 → server123
--   chef1   → chef123
--   casher1 → casher123
-- ────────────────────────────────────────────────────────────
INSERT INTO users (username, password, role) VALUES
  ('admin',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'admin'),
  ('manager',
   '$2a$10$mQmHDZUVOCZEGEtbzEXJDOZBRpGkUSWk8BFGHhh/dHt4I6H0vS3d.',
   'manager'),
  ('server1',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'server'),
  ('chef1',
   '$2a$10$TKh8H1.PfQ0A32cv.XKDQ.6ghcSKwmvFDp7LpCixHMKFvbVXTMH.e',
   'chef'),
  ('casher1',
   '$2a$10$ousQ5bJDUMDGzwNwHkL6/uLDY.bKJ3d8qSnfW2bXQKDH0oWP6pADa',
   'casher')
ON CONFLICT (username) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Menu items (6 combo)
-- ────────────────────────────────────────────────────────────
INSERT INTO menu_items (id, name, price, is_available) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Combo Gà Hàn Quốc',        130000, true),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Combo Gogi Bò Nướng',      180000, true),
  ('a1b2c3d4-0000-0000-0000-000000000003', 'Combo Phở Đặc Biệt',       95000,  true),
  ('a1b2c3d4-0000-0000-0000-000000000004', 'Combo Trẻ Em Khuyến Mãi',  65000,  true),
  ('a1b2c3d4-0000-0000-0000-000000000005', 'Combo Hải Sản Cao Cấp',    250000, true),
  ('a1b2c3d4-0000-0000-0000-000000000006', 'Combo Chay Thanh Đạm',     80000,  true)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Dishes (món ăn trong từng combo)
-- ────────────────────────────────────────────────────────────
INSERT INTO dishes (id, name, category, cooking_method) VALUES
  -- Combo Gà Hàn Quốc
  ('d0000000-0000-0000-0000-000000000001', 'Gà nướng Hàn Quốc',       'mặn', 'nướng'),
  ('d0000000-0000-0000-0000-000000000002', 'Rau muống xào tỏi',        'mặn', 'xào'),
  ('d0000000-0000-0000-0000-000000000003', 'Cơm trắng',                'mặn', 'hấp'),

  -- Combo Gogi Bò Nướng
  ('d0000000-0000-0000-0000-000000000004', 'Bò nướng than hoa',        'mặn', 'nướng'),
  ('d0000000-0000-0000-0000-000000000005', 'Salad rau cải',            'ngọt', 'sống'),
  ('d0000000-0000-0000-0000-000000000006', 'Cơm trắng',                'mặn', 'hấp'),

  -- Combo Phở Đặc Biệt
  ('d0000000-0000-0000-0000-000000000007', 'Phở bò tái chín',          'mặn', 'hầm'),
  ('d0000000-0000-0000-0000-000000000008', 'Hành ngò',                 'mặn', 'sống'),

  -- Combo Trẻ Em
  ('d0000000-0000-0000-0000-000000000009', 'Gà rán giòn',              'mặn', 'chiên'),
  ('d0000000-0000-0000-0000-000000000010', 'Cơm trắng',                'mặn', 'hấp'),

  -- Combo Hải Sản
  ('d0000000-0000-0000-0000-000000000011', 'Tôm nướng muối ớt',        'mặn', 'nướng'),
  ('d0000000-0000-0000-0000-000000000012', 'Mực xào chua ngọt',        'mặn', 'xào'),
  ('d0000000-0000-0000-0000-000000000013', 'Cơm trắng',                'mặn', 'hấp'),

  -- Combo Chay
  ('d0000000-0000-0000-0000-000000000014', 'Đậu hũ chiên sả ớt',       'mặn', 'chiên'),
  ('d0000000-0000-0000-0000-000000000015', 'Rau cải luộc',             'ngọt', 'luộc'),
  ('d0000000-0000-0000-0000-000000000016', 'Cơm gạo lứt',              'ngọt', 'hấp')
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Combo → Dish mapping
-- ────────────────────────────────────────────────────────────
INSERT INTO combo_dishes (combo_id, dish_id) VALUES
  -- Gà Hàn Quốc
  ('a1b2c3d4-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003'),

  -- Gogi Bò Nướng
  ('a1b2c3d4-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000004'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000006'),

  -- Phở Đặc Biệt
  ('a1b2c3d4-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000007'),
  ('a1b2c3d4-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000008'),

  -- Trẻ Em
  ('a1b2c3d4-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000009'),
  ('a1b2c3d4-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000010'),

  -- Hải Sản
  ('a1b2c3d4-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000011'),
  ('a1b2c3d4-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000012'),
  ('a1b2c3d4-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000013'),

  -- Chay
  ('a1b2c3d4-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000014'),
  ('a1b2c3d4-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000015'),
  ('a1b2c3d4-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000016')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Dish → Ingredient mapping
-- ────────────────────────────────────────────────────────────
INSERT INTO dish_ingredients (dish_id, ingredient_name, qty_needed, unit) VALUES
  -- Gà nướng Hàn Quốc
  ('d0000000-0000-0000-0000-000000000001', 'Gà',       0.5,  'kg'),
  ('d0000000-0000-0000-0000-000000000001', 'Tỏi',      30,   'g'),
  ('d0000000-0000-0000-0000-000000000001', 'Nước mắm', 50,   'ml'),

  -- Rau muống xào tỏi
  ('d0000000-0000-0000-0000-000000000002', 'Rau muống', 1,   'bó'),
  ('d0000000-0000-0000-0000-000000000002', 'Dầu ăn',   30,   'ml'),
  ('d0000000-0000-0000-0000-000000000002', 'Tỏi',      20,   'g'),

  -- Cơm trắng (dùng chung nhiều combo)
  ('d0000000-0000-0000-0000-000000000003', 'Gạo',     0.2,   'kg'),
  ('d0000000-0000-0000-0000-000000000006', 'Gạo',     0.2,   'kg'),
  ('d0000000-0000-0000-0000-000000000010', 'Gạo',     0.2,   'kg'),
  ('d0000000-0000-0000-0000-000000000013', 'Gạo',     0.2,   'kg'),

  -- Bò nướng
  ('d0000000-0000-0000-0000-000000000004', 'Bò',       0.4,  'kg'),
  ('d0000000-0000-0000-0000-000000000004', 'Hành',     30,   'g'),
  ('d0000000-0000-0000-0000-000000000004', 'Nước mắm', 40,   'ml'),

  -- Salad rau cải
  ('d0000000-0000-0000-0000-000000000005', 'Rau cải',  0.5,  'bó'),
  ('d0000000-0000-0000-0000-000000000005', 'Dầu ăn',   20,   'ml'),

  -- Phở bò
  ('d0000000-0000-0000-0000-000000000007', 'Bò',       0.3,  'kg'),
  ('d0000000-0000-0000-0000-000000000007', 'Xương hầm',0.5,  'kg'),
  ('d0000000-0000-0000-0000-000000000007', 'Bún/Phở',  0.2,  'kg'),
  ('d0000000-0000-0000-0000-000000000007', 'Muối',     10,   'g'),

  -- Hành ngò
  ('d0000000-0000-0000-0000-000000000008', 'Hành',     20,   'g'),

  -- Gà rán
  ('d0000000-0000-0000-0000-000000000009', 'Gà',       0.4,  'kg'),
  ('d0000000-0000-0000-0000-000000000009', 'Dầu ăn',   200,  'ml'),
  ('d0000000-0000-0000-0000-000000000009', 'Muối',     5,    'g'),

  -- Tôm nướng
  ('d0000000-0000-0000-0000-000000000011', 'Tôm',      0.3,  'kg'),
  ('d0000000-0000-0000-0000-000000000011', 'Muối',     10,   'g'),

  -- Mực xào
  ('d0000000-0000-0000-0000-000000000012', 'Mực',      0.3,  'kg'),
  ('d0000000-0000-0000-0000-000000000012', 'Dầu ăn',   30,   'ml'),
  ('d0000000-0000-0000-0000-000000000012', 'Đường',    15,   'g'),

  -- Đậu hũ chiên
  ('d0000000-0000-0000-0000-000000000014', 'Đậu hũ',   0.3,  'kg'),
  ('d0000000-0000-0000-0000-000000000014', 'Dầu ăn',   100,  'ml'),
  ('d0000000-0000-0000-0000-000000000014', 'Muối',     5,    'g'),

  -- Rau cải luộc
  ('d0000000-0000-0000-0000-000000000015', 'Rau cải',  1,    'bó'),
  ('d0000000-0000-0000-0000-000000000015', 'Muối',     5,    'g'),

  -- Cơm gạo lứt
  ('d0000000-0000-0000-0000-000000000016', 'Gạo',      0.2,  'kg')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Ingredients (kho nguyên liệu)
-- ────────────────────────────────────────────────────────────
INSERT INTO ingredients (name, quantity, unit, threshold) VALUES
  ('Gà',       50,    'kg',  10),
  ('Bò',       30,    'kg',  8),
  ('Rau muống',100,   'bó',  20),
  ('Dầu ăn',   20000, 'ml',  3000),
  ('Tỏi',      5000,  'g',   500),
  ('Hành',     3000,  'g',   400),
  ('Bún/Phở',  80,    'kg',  15),
  ('Xương hầm',25,    'kg',  5),
  ('Tôm',      20,    'kg',  5),
  ('Mực',      15,    'kg',  4),
  ('Rau cải',  60,    'bó',  10),
  ('Đậu hũ',   40,    'kg',  8),
  ('Nước mắm', 10000, 'ml',  1000),
  ('Muối',     5000,  'g',   500),
  ('Đường',    3000,  'g',   300),
  ('Gạo',      100,   'kg',  20)
ON CONFLICT (name) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Tables (10 bàn)
-- ────────────────────────────────────────────────────────────
INSERT INTO tables (table_number, status) VALUES
  ('001', 'available'), ('002', 'available'), ('003', 'available'),
  ('004', 'available'), ('005', 'available'), ('006', 'available'),
  ('007', 'available'), ('008', 'available'), ('009', 'available'),
  ('010', 'available')
ON CONFLICT (table_number) DO NOTHING;


-- ============================================================
-- KIỂM TRA SAU KHI CHẠY
-- ============================================================
SELECT 'users'       AS tbl, COUNT(*) FROM users
UNION ALL
SELECT 'menu_items',          COUNT(*) FROM menu_items
UNION ALL
SELECT 'dishes',              COUNT(*) FROM dishes
UNION ALL
SELECT 'combo_dishes',        COUNT(*) FROM combo_dishes
UNION ALL
SELECT 'dish_ingredients',    COUNT(*) FROM dish_ingredients
UNION ALL
SELECT 'ingredients',         COUNT(*) FROM ingredients
UNION ALL
SELECT 'tables',              COUNT(*) FROM tables;

-- Kết quả mong đợi:
-- users            | 5
-- menu_items       | 6
-- dishes           | 16
-- combo_dishes     | 16
-- dish_ingredients | 32
-- ingredients      | 16
-- tables           | 10