# IRMS — Integrated Restaurant Management System

Hệ thống quản lý nhà hàng tích hợp, xây dựng trên kiến trúc event-driven với React + Express + PostgreSQL.

## Mục lục

- [Tổng quan kiến trúc](./architecture.md)
- [Hướng dẫn cài đặt](./setup.md)
- [Tài liệu API](./api.md)
- [Lược đồ cơ sở dữ liệu](./database.md)
- [Hướng dẫn triển khai](./deployment.md)

## Công nghệ

| Layer    | Stack                                  |
| -------- | -------------------------------------- |
| Frontend | React 18, TypeScript, Vite, Axios      |
| Backend  | Express 4, TypeScript, pg, JWT, bcrypt |
| Database | PostgreSQL 16                          |
| Infra    | Docker, Docker Compose, nginx          |

## Vai trò người dùng

| Role    | Quyền truy cập                        |
| ------- | ------------------------------------- |
| admin   | Toàn quyền, tạo tài khoản            |
| manager | Sơ đồ bàn, kho, doanh thu            |
| server  | Tạo đơn, xem bàn                     |
| chef    | Bảng bếp (KDS)                       |
| casher  | Thanh toán hóa đơn                   |
