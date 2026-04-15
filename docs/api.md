# Tài liệu API

Base URL: `/api`

Tất cả endpoint (trừ `/auth/login`) yêu cầu header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Auth

### POST /api/auth/login

Đăng nhập, trả về JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 401:**
```json
{
  "error": "Invalid credentials"
}
```

---

## Menu & Orders

### GET /api/menu

Lấy danh sách menu (combo).

**Roles:** tất cả (đã đăng nhập)

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Combo Gà Hàn Quốc",
    "price": 130000,
    "isAvailable": true
  }
]
```

### PATCH /api/menu/:id/availability

Bật/tắt combo trên menu.

**Roles:** admin, manager

**Request:**
```json
{
  "isAvailable": false
}
```

**Response 200:**
```json
{ "ok": true }
```

### POST /api/orders

Tạo đơn hàng mới. Phát event `ORDER_CREATED`.

**Roles:** server, manager, admin

**Request:**
```json
{
  "tableId": "001",
  "comboId": "a1b2c3d4-0000-0000-0000-000000000001",
  "quantity": 2,
  "notes": "Không cay"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "tableId": "001",
  "comboId": "uuid",
  "comboName": "Combo Gà Hàn Quốc",
  "quantity": 2,
  "notes": "Không cay",
  "totalPrice": 260000,
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/orders/table/:tableId

Lấy danh sách đơn hàng theo bàn.

**Roles:** server, casher, manager, admin

**Response 200:** Mảng Order objects.

---

## Kitchen

### GET /api/kitchen/tickets

Lấy danh sách ticket đang hoạt động (pending + cooking).

**Roles:** chef, manager, admin

**Response 200:**
```json
[
  {
    "id": "uuid",
    "orderId": "uuid",
    "tableId": "001",
    "comboName": "Combo Gà Hàn Quốc",
    "quantity": 2,
    "notes": "Không cay",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### PATCH /api/kitchen/:id/start

Bắt đầu nấu ticket (status → cooking).

**Roles:** chef, manager, admin

### PATCH /api/kitchen/:id/done

Đánh dấu ticket hoàn thành. Phát event `ORDER_COMPLETED`.

**Roles:** chef, manager, admin

---

## Tables

### GET /api/tables

Lấy danh sách tất cả bàn.

**Roles:** server, manager, admin, casher

**Response 200:**
```json
[
  {
    "id": "uuid",
    "tableNumber": "001",
    "status": "available"
  }
]
```

Trạng thái bàn: `available` | `occupied` | `food_ready`

---

## Billing

### GET /api/billing/:tableId

Lấy hóa đơn đang chờ thanh toán theo bàn.

**Roles:** casher, manager, admin

**Response 200:**
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "tableId": "001",
  "totalAmount": 260000,
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Response 404:** Không có hóa đơn chờ thanh toán.

### POST /api/billing/:billId/pay

Xác nhận thanh toán. Phát event `PAYMENT_COMPLETED`.

**Roles:** casher, manager, admin

---

## Inventory

### GET /api/inventory

Lấy danh sách nguyên liệu trong kho.

**Roles:** manager, admin

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Gà",
    "quantity": 50,
    "unit": "kg",
    "threshold": 10
  }
]
```

### PATCH /api/inventory/:name

Cập nhật số lượng nguyên liệu.

**Roles:** manager, admin

**Request:**
```json
{
  "quantity": 100
}
```

---

## Analytics

### GET /api/analytics/revenue?date=YYYY-MM-DD

Lấy tổng doanh thu theo ngày.

**Roles:** manager, admin

**Response 200:**
```json
{
  "date": "2024-01-01",
  "total": 1500000
}
```

---

## User Management

### POST /api/analytics/users

Tạo tài khoản mới.

**Roles:** admin

**Request:**
```json
{
  "username": "server2",
  "password": "password123",
  "role": "server"
}
```

### GET /api/analytics/users

Lấy danh sách tài khoản.

**Roles:** admin

---

## Health Check

### GET /health

**Response 200:**
```json
{
  "status": "ok",
  "db": "connected",
  "ts": "2024-01-01T00:00:00.000Z"
}
```

**Response 503:**
```json
{
  "status": "error",
  "db": "disconnected"
}
```

---

## Mã lỗi

| HTTP Code | Ý nghĩa               |
| --------- | ---------------------- |
| 400       | Dữ liệu không hợp lệ |
| 401       | Chưa đăng nhập / token hết hạn |
| 403       | Không đủ quyền         |
| 404       | Không tìm thấy         |
| 500       | Lỗi server             |
| 503       | Database không kết nối |
