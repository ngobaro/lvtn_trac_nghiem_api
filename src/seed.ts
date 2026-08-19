/**
 * Seed dữ liệu demo cho mô hình mới (học kỳ / phân công / ghi danh).
 *
 * Cách chạy (sau khi đã dựng schema bằng DB_SYNCHRONIZE=true một lần):
 *   npm run seed
 *
 * Mật khẩu mặc định cho mọi tài khoản demo: 123456
 *
 * Dùng DataSource TypeORM độc lập (KHÔNG bootstrap AppModule) để tránh phụ
 * thuộc Redis/Cache/Gateway khi seed.
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { NguoiDung } from './modules/auth/entities/nguoi-dung.entity';
import { NhaCungCapXacThuc } from './modules/auth/entities/nha-cung-cap-xac-thuc.entity';
import { MonHoc } from './modules/subjects/entities/mon-hoc.entity';
import { HocKy } from './modules/semesters/entities/hoc-ky.entity';
import { MonHocHocKy } from './modules/subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { PhanCongGiangDay } from './modules/teaching-assignments/entities/phan-cong-giang-day.entity';
import { GhiDanh } from './modules/enrollments/entities/ghi-danh.entity';
import { VaiTro } from './common/enums/vai-tro.enum';
import { NhaCungCap } from './common/enums/nha-cung-cap.enum';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 4000,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  timezone: 'Z',
  ssl: { rejectUnauthorized: true },
  synchronize: false,
  entities: [
    NguoiDung,
    NhaCungCapXacThuc,
    MonHoc,
    HocKy,
    MonHocHocKy,
    PhanCongGiangDay,
    GhiDanh,
  ],
});

async function taoNguoiDung(
  ds: DataSource,
  ten: string,
  email: string,
  vaiTro: VaiTro,
): Promise<NguoiDung> {
  const ndRepo = ds.getRepository(NguoiDung);
  let nd = await ndRepo.findOne({ where: { email } });
  if (!nd) {
    nd = await ndRepo.save(
      ndRepo.create({ tenNguoiDung: ten, email, vaiTro, laHoatDong: true }),
    );
    const hash = await bcrypt.hash('123456', 10);
    await ds.getRepository(NhaCungCapXacThuc).save({
      maNguoiDung: nd.maNguoiDung,
      nhaCungCap: NhaCungCap.LOCAL,
      matKhau: hash,
    });
  }
  return nd;
}

async function bootstrap() {
  const ds = await dataSource.initialize();

  // Người dùng
  await taoNguoiDung(
    ds,
    'Quản trị viên',
    'tieuhaidang1@gmail.com',
    VaiTro.QUAN_TRI_VIEN,
  );

  // eslint-disable-next-line no-console
  console.log(
    '✅ Seed demo hoàn tất. Đăng nhập: tieuhaidang1@gmail.com / 123456',
  );
  await ds.destroy();
  process.exit(0);
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('❌ Seed thất bại:', e);
  process.exit(1);
});
