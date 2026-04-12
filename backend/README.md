# IRMS Backend — Hướng dẫn chạy

## Yêu cầu
- Node.js >= 18
- PostgreSQL >= 14 (đang chạy)

---

## Bước 1 — Tạo database PostgreSQL

Mở psql hoặc pgAdmin, chạy:

```sql
CREATE DATABASE irms;
```

---

## Bước 2 — Cấu hình .env

File `.env` đã có sẵn trong thư mục `backend/`. Sửa nếu cần:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=irms
DB_USER=postgres
DB_PASSWORD=postgres   ← đổi thành password PostgreSQL của bạn

JWT_SECRET=irms_super_secret_key_change_in_production
JWT_EXPIRES_IN=8h
PORT=3000
```

---

## Bước 3 — Cài dependencies

```bash
cd irms/backend
npm install
```

---

## Bước 4 — Tạo bảng và seed data

```bash
npm run db:init
```

Lệnh này sẽ:
- Tạo toàn bộ bảng (users, menu_items, tables, orders, kitchen_tickets, bills, revenues, ingredients, ...)
- Seed 5 tài khoản mặc định:

| Username | Password   | Role    |
|----------|------------|---------|
| admin    | admin123   | admin   |
| manager  | manager123 | manager |
| server1  | server123  | server  |
| chef1    | chef123    | chef    |
| casher1  | casher123  | casher  |

- Seed 6 combo menu và 10 bàn (001–010)
- Seed 15 nguyên liệu kho

---

## Bước 5 — Chạy dev server

```bash
npm run dev
```

Server chạy tại: **http://localhost:3000**

Kiểm tra: `http://localhost:3000/health` → `{ "status": "ok", "db": "connected" }`

---

## Chạy Frontend song song

```bash
# Terminal 1 — Backend
cd irms/backend && npm run dev

# Terminal 2 — Frontend
cd irms/frontend && npm install && npm run dev
```

Frontend: **http://localhost:5173**

---

## API Endpoints

### Auth
| Method | URL              | Role  | Mô tả         |
|--------|------------------|-------|---------------|
| POST   | /api/auth/login  | public| Đăng nhập     |

### Menu & Orders
| Method | URL                          | Role                        |
|--------|------------------------------|-----------------------------|
| GET    | /api/menu                    | all authenticated           |
| PATCH  | /api/menu/:id/availability   | admin, manager              |
| POST   | /api/orders                  | server, manager, admin      |
| GET    | /api/orders/table/:tableId   | server, casher, manager, admin |

### Kitchen
| Method | URL                    | Role                   |
|--------|------------------------|------------------------|
| GET    | /api/kitchen/tickets   | chef, manager, admin   |
| PATCH  | /api/kitchen/:id/start | chef, manager, admin   |
| PATCH  | /api/kitchen/:id/done  | chef, manager, admin   |

### Tables
| Method | URL          | Role                              |
|--------|--------------|-----------------------------------|
| GET    | /api/tables  | server, casher, manager, admin    |

### Billing
| Method | URL                      | Role                  |
|--------|--------------------------|-----------------------|
| GET    | /api/billing/:tableId    | casher, manager, admin|
| POST   | /api/billing/:billId/pay | casher, manager, admin|

### Inventory
| Method | URL                    | Role            |
|--------|------------------------|-----------------|
| GET    | /api/inventory         | manager, admin  |
| PATCH  | /api/inventory/:name   | manager, admin  |

### Analytics & Admin
| Method | URL                      | Role    |
|--------|--------------------------|---------|
| GET    | /api/analytics/revenue   | manager, admin |
| POST   | /api/analytics/users     | admin   |
| GET    | /api/analytics/users     | admin   |

---

## Event Flow

```
[Server tạo đơn]
  POST /api/orders
    → ORDER_CREATED
      ├── Kitchen:   tạo ticket (status: pending)
      ├── Table:     bàn → occupied
      └── Inventory: trừ kho → nếu thiếu → RAW_MATERIAL_LOW
                                              └── Order: ẩn combo

[Chef nấu xong]
  PATCH /api/kitchen/:id/done
    → ORDER_COMPLETED
      ├── Table:   bàn → food_ready
      └── Billing: tạo bill pending

[Thu ngân thanh toán]
  POST /api/billing/:billId/pay
    → PAYMENT_COMPLETED
      ├── Table:     bàn → available
      └── Analytics: ghi doanh thu
```
