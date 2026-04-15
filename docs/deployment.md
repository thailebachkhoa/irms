# Hướng dẫn triển khai

## Docker Compose (Production)

### 1. Chuẩn bị

```bash
cp .env.example .env
```

Chỉnh sửa `.env` — thay đổi giá trị cho production:

```
POSTGRES_PASSWORD=<mật-khẩu-mạnh>
DB_PASSWORD=<mật-khẩu-mạnh>
JWT_SECRET=<chuỗi-ngẫu-nhiên-256-bit>
```

### 2. Build và chạy

```bash
docker compose up -d --build
```

### 3. Kiểm tra

```bash
curl http://localhost/health
```

### 4. Xem logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### 5. Dừng hệ thống

```bash
docker compose down
```

Dữ liệu PostgreSQL được lưu trong Docker volume `pgdata`, không bị mất khi restart.

### 6. Reset database

```bash
docker compose down -v
docker compose up -d --build
```

## Cấu hình nginx

File `frontend/nginx.conf` cấu hình:

- Serve static files từ `/usr/share/nginx/html`
- Proxy `/api` và `/health` sang `backend:3000`
- SPA fallback: tất cả route khác → `index.html`

## Cấu trúc Docker

| Service  | Image              | Port         | Phụ thuộc     |
| -------- | ------------------ | ------------ | ------------- |
| db       | postgres:16-alpine | 5432:5432    | —             |
| backend  | Custom (Node.js)   | 3000:3000    | db (healthy)  |
| frontend | Custom (nginx)     | 80:80        | backend       |

### Backend Dockerfile

Multi-stage build:
1. **Build stage:** Cài dependencies, compile TypeScript
2. **Production stage:** Chỉ copy `dist/` và production dependencies

### Frontend Dockerfile

Multi-stage build:
1. **Build stage:** Cài dependencies, build React với Vite
2. **Production stage:** nginx Alpine serve static files

### Entrypoint

Backend sử dụng `docker-entrypoint.sh`:
1. Chạy `initDb.js` — tạo bảng + seed data (idempotent)
2. Chạy `app.js` — khởi động server

## Scaling

Hệ thống hiện tại phù hợp cho nhà hàng vừa và nhỏ (1-50 bàn). Để scale:

- **Database:** Thêm connection pool, read replicas
- **Event Bus:** Thay `SimpleEventBus` bằng Redis Pub/Sub hoặc RabbitMQ
- **Frontend:** Thêm CDN, asset caching
- **Backend:** Horizontal scaling với load balancer
