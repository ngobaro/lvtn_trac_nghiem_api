import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 4000,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  // Ghim driver về UTC: mọi giá trị DATETIME đọc/ghi đều diễn giải theo UTC,
  // nhất quán dù app chạy ở dev (UTC+7) hay production (UTC). Tránh lệch giờ
  // khi so sánh hạn nộp / đếm ngược thời gian thi.
  timezone: 'Z',
  autoLoadEntities: true,
  // Chỉ bật khi cần dựng lại schema (đặt DB_SYNCHRONIZE=true trong .env),
  // chạy 1 lần trên DB dev/demo rồi tắt lại (bỏ biến hoặc đặt false).
  // CẢNH BÁO: true có thể tự xóa/sửa cột & bảng — không dùng trên dữ liệu cần giữ.
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  ssl: {
    rejectUnauthorized: true,
  },
});
