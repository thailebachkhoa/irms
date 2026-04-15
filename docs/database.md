# Lược đồ cơ sở dữ liệu

PostgreSQL 16 — extension `pgcrypto` cho UUID generation.

## Sơ đồ quan hệ

```
users

menu_items ◄──── combo_dishes ────► dishes ◄──── dish_ingredients ────► ingredients
                                      │
                                      │ (recipe lookup)
                                      ▼
orders ◄──── kitchen_tickets
  │
  └──── bills ◄──── revenues

tables
```

## Bảng chi tiết

### users

| Cột        | Kiểu         | Ràng buộc                                          |
| ---------- | ------------ | -------------------------------------------------- |
| id         | UUID         | PK, default gen_random_uuid()                      |
| username   | VARCHAR(50)  | UNIQUE NOT NULL                                    |
| password   | TEXT         | NOT NULL (bcrypt hash)                             |
| role       | VARCHAR(20)  | NOT NULL, CHECK (admin/manager/server/chef/casher) |
| created_at | TIMESTAMPTZ  | DEFAULT NOW()                                      |

### menu_items

| Cột          | Kiểu         | Ràng buộc                     |
| ------------ | ------------ | ----------------------------- |
| id           | UUID         | PK                            |
| name         | VARCHAR(100) | NOT NULL                      |
| price        | INTEGER      | NOT NULL, CHECK >= 0 (VND)    |
| is_available | BOOLEAN      | DEFAULT TRUE                  |
| created_at   | TIMESTAMPTZ  | DEFAULT NOW()                 |

### dishes

| Cột            | Kiểu         | Ràng buộc |
| -------------- | ------------ | --------- |
| id             | UUID         | PK        |
| name           | VARCHAR(100) | NOT NULL  |
| category       | VARCHAR(50)  |           |
| cooking_method | VARCHAR(50)  |           |

### combo_dishes

| Cột      | Kiểu | Ràng buộc                           |
| -------- | ---- | ----------------------------------- |
| combo_id | UUID | FK → menu_items(id), ON DELETE CASCADE |
| dish_id  | UUID | FK → dishes(id), ON DELETE CASCADE     |
|          |      | PK (combo_id, dish_id)              |

### ingredients

| Cột       | Kiểu          | Ràng buộc                     |
| --------- | ------------- | ----------------------------- |
| id        | UUID          | PK                            |
| name      | VARCHAR(100)  | UNIQUE NOT NULL               |
| quantity  | NUMERIC(10,2) | NOT NULL, DEFAULT 0, CHECK >= 0 |
| unit      | VARCHAR(20)   | NOT NULL                      |
| threshold | NUMERIC(10,2) | NOT NULL, DEFAULT 0           |

### dish_ingredients

| Cột             | Kiểu          | Ràng buộc                         |
| --------------- | ------------- | --------------------------------- |
| dish_id         | UUID          | FK → dishes(id), ON DELETE CASCADE |
| ingredient_name | VARCHAR(100)  | NOT NULL                          |
| qty_needed      | NUMERIC(10,2) | NOT NULL, CHECK > 0               |
| unit            | VARCHAR(20)   | NOT NULL                          |
|                 |               | PK (dish_id, ingredient_name)     |

### tables

| Cột          | Kiểu        | Ràng buộc                                       |
| ------------ | ----------- | ----------------------------------------------- |
| id           | UUID        | PK                                              |
| table_number | VARCHAR(10) | UNIQUE NOT NULL                                 |
| status       | VARCHAR(20) | DEFAULT 'available', CHECK (available/occupied/food_ready) |

### orders

| Cột         | Kiểu         | Ràng buộc                                    |
| ----------- | ------------ | -------------------------------------------- |
| id          | UUID         | PK                                           |
| table_id    | VARCHAR(20)  | NOT NULL                                     |
| combo_id    | UUID         | FK → menu_items(id)                          |
| combo_name  | VARCHAR(100) | NOT NULL                                     |
| quantity    | INTEGER      | NOT NULL, DEFAULT 1                          |
| notes       | TEXT         | DEFAULT ''                                   |
| total_price | INTEGER      | NOT NULL                                     |
| status      | VARCHAR(20)  | DEFAULT 'pending', CHECK (pending/cooking/done) |
| created_at  | TIMESTAMPTZ  | DEFAULT NOW()                                |

### kitchen_tickets

| Cột        | Kiểu         | Ràng buộc                                    |
| ---------- | ------------ | -------------------------------------------- |
| id         | UUID         | PK                                           |
| order_id   | UUID         | FK → orders(id), ON DELETE CASCADE           |
| table_id   | VARCHAR(20)  | NOT NULL                                     |
| combo_name | VARCHAR(100) | NOT NULL                                     |
| quantity   | INTEGER      | NOT NULL                                     |
| notes      | TEXT         | DEFAULT ''                                   |
| status     | VARCHAR(20)  | DEFAULT 'pending', CHECK (pending/cooking/done) |
| created_at | TIMESTAMPTZ  | DEFAULT NOW()                                |

### bills

| Cột          | Kiểu        | Ràng buộc                          |
| ------------ | ----------- | ---------------------------------- |
| id           | UUID        | PK                                 |
| order_id     | UUID        | FK → orders(id)                    |
| table_id     | VARCHAR(20) | NOT NULL                           |
| total_amount | INTEGER     | NOT NULL                           |
| status       | VARCHAR(20) | DEFAULT 'pending', CHECK (pending/paid) |
| created_at   | TIMESTAMPTZ | DEFAULT NOW()                      |

### revenues

| Cột        | Kiểu        | Ràng buộc       |
| ---------- | ----------- | --------------- |
| id         | UUID        | PK              |
| bill_id    | UUID        | FK → bills(id)  |
| amount     | INTEGER     | NOT NULL        |
| date       | DATE        | NOT NULL        |
| created_at | TIMESTAMPTZ | DEFAULT NOW()   |

## Seed Data

Dữ liệu mẫu được tạo tự động qua `npm run db:init`:

- 5 tài khoản (admin, manager, server1, chef1, casher1)
- 6 combo menu
- 11 món ăn
- 15 nguyên liệu với ngưỡng cảnh báo
- 10 bàn ăn
