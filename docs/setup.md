# Hướng dẫn cài đặt

## Yêu cầu

- Node.js >= 18
- PostgreSQL >= 14
- Docker + Docker Compose (cho phương thức Docker)

## Phương thức 1: Docker Compose (khuyến nghị)

```bash
git clone <repo-url> irms
cd irms

docker compose up --build
```

Truy cập:
- Frontend: http://localhost
- Backend API: http://localhost:3000/api
- Health check: http://localhost:3000/health

Database tự động khởi tạo schema và seed data khi backend khởi động lần đầu.

## Phương thức 2: Chạy thủ công

### 1. Tạo database

```bash
psql -U postgres -c "CREATE DATABASE irms;"
psql -U postgres -d irms -f db/irms.sql
```

### 2. Cấu hình backend

```bash
cd backend
cp ../.env.example .env
```

Chỉnh sửa `backend/.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=irms
DB_USER=postgres
DB_PASSWORD=<mật-khẩu-postgres>
JWT_SECRET=<chuỗi-bí-mật-tùy-ý>
JWT_EXPIRES_IN=8h
PORT=3000
```

### 3. Cài đặt và chạy backend

```bash
cd backend
npm install
npm run db:init
npm run dev
```

### 4. Cấu hình và chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định chạy tại http://localhost:5173, tự động proxy `/api` sang backend.

## Tài khoản mặc định

| Username | Password   | Role    |
| -------- | ---------- | ------- |
| admin    | admin123   | admin   |
| manager  | manager123 | manager |
| server1  | server123  | server  |
| chef1    | chef123    | chef    |
| casher1  | casher123  | casher  |

## Biến môi trường

| Biến              | Mô tả                           | Mặc định                                    |
| ----------------- | -------------------------------- | -------------------------------------------- |
| `DB_HOST`         | PostgreSQL host                  | `localhost`                                  |
| `DB_PORT`         | PostgreSQL port                  | `5432`                                       |
| `DB_NAME`         | Tên database                     | `irms`                                       |
| `DB_USER`         | Database user                    | `postgres`                                   |
| `DB_PASSWORD`     | Database password                | `postgres`                                   |
| `JWT_SECRET`      | Khóa bí mật JWT                  | `irms_super_secret_key_change_in_production` |
| `JWT_EXPIRES_IN`  | Thời gian hết hạn token          | `8h`                                         |
| `PORT`            | Backend port                     | `3000`                                       |
| `VITE_API_URL`    | Frontend API base URL            | `http://localhost:3000/api`                  |
