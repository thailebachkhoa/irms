# Kiến trúc hệ thống

## Tổng quan

IRMS sử dụng kiến trúc module hóa theo domain, kết nối bằng event bus nội bộ. Mỗi module chứa repository (data access), service (business logic) và routes (HTTP layer).

```
┌──────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│  LoginPage → ServerPage → KitchenPage → CasherPage   │
│              ManagerPage → AdminPage                  │
└─────────────────────┬────────────────────────────────┘
                      │ HTTP (Axios)
                      ▼
┌──────────────────────────────────────────────────────┐
│                 nginx (reverse proxy)                │
│              / → static files (React build)          │
│           /api → backend:3000                        │
└─────────────────────┬────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────┐
│                Backend (Express + TS)                 │
│                                                      │
│  ┌──────┐  ┌───────┐  ┌────────┐  ┌──────────┐     │
│  │ Auth │  │ Order │  │Kitchen │  │  Table   │     │
│  └──────┘  └───┬───┘  └───┬────┘  └────┬─────┘     │
│                │          │            │             │
│           ┌────▼──────────▼────────────▼────┐       │
│           │       SimpleEventBus            │       │
│           └────┬──────────┬────────────┬────┘       │
│                │          │            │             │
│  ┌─────────┐  ┌▼────────┐  ┌──────────▼──┐         │
│  │Billing  │  │Inventory│  │ Analytics   │         │
│  └─────────┘  └─────────┘  └─────────────┘         │
└─────────────────────┬────────────────────────────────┘
                      │ pg (Pool)
                      ▼
┌──────────────────────────────────────────────────────┐
│               PostgreSQL 16                          │
│  users, menu_items, dishes, combo_dishes,            │
│  ingredients, dish_ingredients, tables,              │
│  orders, kitchen_tickets, bills, revenues            │
└──────────────────────────────────────────────────────┘
```

## Luồng Event

Các module giao tiếp qua 4 event chính:

```
ORDER_CREATED ──────┬──→ Kitchen (tạo ticket)
                    ├──→ Table (trạng thái → occupied)
                    └──→ Inventory (trừ kho → có thể phát RAW_MATERIAL_LOW)

ORDER_COMPLETED ────┬──→ Billing (tạo hóa đơn)
                    ├──→ Table (trạng thái → food_ready)
                    └──→ Order (cập nhật status → done)

PAYMENT_COMPLETED ──┬──→ Analytics (ghi doanh thu)
                    └──→ Table (trạng thái → available)

RAW_MATERIAL_LOW ───────→ Order (ẩn combo khỏi menu)
```

## Thứ tự đăng ký module

Subscriber phải được đăng ký trước publisher để không bỏ lỡ event:

1. **Auth** — không dùng event bus
2. **Kitchen** — subscribe ORDER_CREATED
3. **Table** — subscribe ORDER_CREATED, ORDER_COMPLETED, PAYMENT_COMPLETED
4. **Billing** — subscribe ORDER_COMPLETED; publish PAYMENT_COMPLETED
5. **Inventory** — subscribe ORDER_CREATED; publish RAW_MATERIAL_LOW
6. **Analytics** — subscribe PAYMENT_COMPLETED
7. **Order** — publish ORDER_CREATED; subscribe RAW_MATERIAL_LOW, ORDER_COMPLETED

## Cấu trúc thư mục

```
irms/
├── backend/
│   ├── src/
│   │   ├── app.ts                     # Entry point
│   │   ├── infrastructure/
│   │   │   ├── auth.ts                # JWT sign/verify, middleware
│   │   │   ├── db.ts                  # PostgreSQL pool
│   │   │   ├── eventBus.ts            # In-process pub/sub
│   │   │   └── initDb.ts             # Schema + seed data
│   │   ├── modules/
│   │   │   ├── auth/                  # Login, user CRUD
│   │   │   │   ├── index.ts
│   │   │   │   ├── repository.ts
│   │   │   │   ├── service.ts
│   │   │   │   └── routes.ts
│   │   │   ├── order/index.ts         # Menu + orders
│   │   │   ├── kitchen/index.ts       # KDS tickets
│   │   │   ├── table/index.ts         # Table status
│   │   │   ├── billing/index.ts       # Bills + payment
│   │   │   ├── inventory/index.ts     # Ingredient stock
│   │   │   └── analytics/index.ts     # Revenue tracking
│   │   └── shared/
│   │       └── events.ts              # Event names + payload types
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx             # Shared header + tabs + logout
│   │   │   ├── BillPanel.tsx
│   │   │   ├── KitchenBoard.tsx
│   │   │   ├── MenuGrid.tsx
│   │   │   ├── OrderForm.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   └── TableMap.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ServerPage.tsx
│   │   │   ├── KitchenPage.tsx
│   │   │   ├── CasherPage.tsx
│   │   │   ├── ManagerPage.tsx
│   │   │   └── AdminPage.tsx
│   │   ├── services/                  # Axios API wrappers
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── context/AuthContext.tsx     # JWT state management
│   │   ├── router/AppRouter.tsx       # Role-based routing
│   │   └── types/index.ts            # Shared TypeScript types
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── tsconfig.json
├── db/
│   └── irms.sql                       # Full schema + seed SQL
├── docker-compose.yml
└── .env.example
```

## Xác thực & phân quyền

- JWT token được tạo khi login, lưu trong `localStorage`
- Axios interceptor tự động gắn `Authorization: Bearer <token>`
- Backend middleware `authenticate` xác thực token
- Middleware `authorize(...roles)` kiểm tra role
- Token hết hạn → frontend redirect về `/login`
