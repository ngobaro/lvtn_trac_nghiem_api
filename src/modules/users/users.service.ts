import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';
import { NhaCungCapXacThuc } from '../auth/entities/nha-cung-cap-xac-thuc.entity';
import { NhaCungCap } from '../../common/enums/nha-cung-cap.enum';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ExcelParserService } from './services/excel-parser.service';
import { ImportUsersDto } from './dto/import-users.dto';
import { CauHoi } from '../questions/entities/cau-hoi.entity';
import { BaiThi } from '../exams/entities/bai-thi.entity';
import { PhongThi } from '../exam-rooms/entities/phong-thi.entity';
import { PhanCongGiangDay } from '../teaching-assignments/entities/phan-cong-giang-day.entity';
import { GhiDanh } from '../enrollments/entities/ghi-danh.entity';
import { BaiLam } from '../exam-sessions/entities/bai-lam.entity';
import { KetQua } from '../results/entities/ket-qua.entity';
import { ThanhVienPhong } from '../exam-rooms/entities/thanh-vien-phong.entity';
import { QueryUserDto } from './dto/query-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Mật khẩu mặc định khi Admin tạo tài khoản mà không nhập mật khẩu.
const MAT_KHAU_MAC_DINH = '123456';

// Regex email cơ bản dùng cho kiểm tra dòng import.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(NguoiDung) private repo: Repository<NguoiDung>,
    @InjectRepository(NhaCungCapXacThuc)
    private xacThucRepo: Repository<NhaCungCapXacThuc>,
    private dataSource: DataSource,
    private excelParser: ExcelParserService,
  ) {}

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 10, vaiTro, laHoatDong, search } = query;
    const qb = this.repo.createQueryBuilder('u');
    if (vaiTro) qb.andWhere('u.vaiTro = :vaiTro', { vaiTro });
    if (laHoatDong !== undefined)
      qb.andWhere('u.laHoatDong = :laHoatDong', { laHoatDong });
    if (search)
      qb.andWhere('(u.tenNguoiDung LIKE :s OR u.email LIKE :s)', {
        s: `%${search}%`,
      });
    const [items, total] = await qb
      .orderBy('u.maNguoiDung', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const user = await this.repo.findOne({ where: { maNguoiDung: id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return user;
  }

  // Lưu 1 người dùng mới + bản ghi xác thực LOCAL trong cùng một EntityManager.
  // Dùng chung cho create() và import hàng loạt để logic tạo tài khoản nhất quán.
  private async luuNguoiDungMoi(
    em: EntityManager,
    data: {
      tenNguoiDung: string;
      email: string;
      vaiTro: VaiTro;
      matKhau?: string;
    },
  ) {
    const nguoiDung = await em.save(
      em.create(NguoiDung, {
        tenNguoiDung: data.tenNguoiDung,
        email: data.email,
        vaiTro: data.vaiTro,
      }),
    );

    const hash = await bcrypt.hash(data.matKhau || MAT_KHAU_MAC_DINH, 10);
    await em.save(NhaCungCapXacThuc, {
      maNguoiDung: nguoiDung.maNguoiDung,
      nhaCungCap: NhaCungCap.LOCAL,
      matKhau: hash,
    });

    return nguoiDung;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.repo.findOne({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email đã tồn tại');

    return this.dataSource.transaction((em) =>
      this.luuNguoiDungMoi(em, {
        tenNguoiDung: dto.tenNguoiDung,
        email: dto.email,
        vaiTro: dto.vaiTro,
        matKhau: dto.matKhau,
      }),
    );
  }

  // Đọc file Excel -> trả danh sách kèm đánh dấu hợp lệ/lý do lỗi (KHÔNG lưu DB).
  async xemTruocImport(file: Express.Multer.File) {
    const danhSachTho = this.excelParser.docDanhSach(file);
    const ketQua = await this.kiemTraDanhSach(danhSachTho);
    return { danhSach: ketQua };
  }

  // Import hàng loạt: bỏ qua dòng lỗi, tạo phần còn lại, báo cáo dòng bị bỏ qua.
  async importNhieu(dto: ImportUsersDto) {
    const ketQua = await this.kiemTraDanhSach(dto.danhSach);

    const danhSachBoQua: { tenNguoiDung: string; email: string; lyDo: string }[] =
      [];
    let soLuongTao = 0;

    for (const dong of ketQua) {
      if (!dong.hopLe) {
        danhSachBoQua.push({
          tenNguoiDung: dong.tenNguoiDung,
          email: dong.email,
          lyDo: dong.lyDo ?? 'Không hợp lệ',
        });
        continue;
      }
      // Mỗi dòng một transaction riêng — lỗi bất ngờ chỉ bỏ qua dòng đó.
      try {
        await this.dataSource.transaction((em) =>
          this.luuNguoiDungMoi(em, {
            tenNguoiDung: dong.tenNguoiDung,
            email: dong.email,
            vaiTro: dto.vaiTro,
          }),
        );
        soLuongTao++;
      } catch {
        danhSachBoQua.push({
          tenNguoiDung: dong.tenNguoiDung,
          email: dong.email,
          lyDo: 'Lỗi khi tạo tài khoản',
        });
      }
    }

    return { soLuongTao, soLuongBoQua: danhSachBoQua.length, danhSachBoQua };
  }

  // Kiểm tra từng dòng: thiếu tên/email, sai định dạng, trùng trong file, đã có trong DB.
  private async kiemTraDanhSach(
    danhSach: { tenNguoiDung: string; email: string }[],
  ) {
    // Gom 1 truy vấn kiểm tra email đã tồn tại trong DB.
    const emails = danhSach
      .map((d) => d.email.trim().toLowerCase())
      .filter((e) => EMAIL_REGEX.test(e));
    const daTonTai = new Set<string>();
    if (emails.length > 0) {
      const rows = await this.repo.find({
        where: { email: In(emails) },
        select: { email: true },
      });
      rows.forEach((r) => daTonTai.add(r.email.toLowerCase()));
    }

    const daGap = new Set<string>();
    return danhSach.map((d) => {
      const tenNguoiDung = d.tenNguoiDung.trim();
      const email = d.email.trim().toLowerCase();
      let lyDo: string | undefined;

      if (!tenNguoiDung) lyDo = 'Thiếu tên';
      else if (!email) lyDo = 'Thiếu email';
      else if (!EMAIL_REGEX.test(email)) lyDo = 'Email không hợp lệ';
      else if (daGap.has(email)) lyDo = 'Email trùng trong file';
      else if (daTonTai.has(email)) lyDo = 'Email đã tồn tại';

      if (email) daGap.add(email);

      return { tenNguoiDung, email, hopLe: !lyDo, lyDo };
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    return this.repo.save({ ...user, ...dto });
  }

  async updateStatus(id: number, laHoatDong: boolean) {
    const user = await this.findOne(id);
    user.laHoatDong = laHoatDong;
    return this.repo.save(user);
  }

  // Xóa: nếu tài khoản CHƯA có dữ liệu liên quan -> xóa cứng hoàn toàn khỏi DB
  // (kèm bản ghi xác thực); nếu còn tham chiếu (đề/kết quả/ghi danh/…) -> xóa mềm
  // để giữ lịch sử, tránh mồ côi dữ liệu.
  async remove(id: number) {
    const user = await this.findOne(id);
    const em = this.repo.manager;

    // Các bảng tham chiếu tới người dùng cần kiểm tra. Bỏ qua
    // NHA_CUNG_CAP_XAC_THUC vì đó là bản ghi xác thực thuộc chính tài khoản.
    const bangThamChieu: [Function, string][] = [
      [CauHoi, 'taoBoi'],
      [BaiThi, 'taoBoi'],
      [PhongThi, 'taoBoi'],
      [PhanCongGiangDay, 'maGiaoVien'],
      [GhiDanh, 'maHocSinh'],
      [BaiLam, 'maNguoiDung'],
      [KetQua, 'maNguoiDung'],
      [ThanhVienPhong, 'maNguoiDung'],
    ];

    let coDuLieuLienQuan = false;
    for (const [entity, cot] of bangThamChieu) {
      const soLuong = await em.count(entity, { where: { [cot]: id } });
      if (soLuong > 0) {
        coDuLieuLienQuan = true;
        break;
      }
    }

    if (coDuLieuLienQuan) {
      // Còn dữ liệu tham chiếu -> xóa mềm (khóa tài khoản).
      user.laHoatDong = false;
      await this.repo.save(user);
      return { daXoaCung: false };
    }

    // Chưa có dữ liệu liên quan -> xóa cứng hoàn toàn khỏi DB.
    await em.transaction(async (m) => {
      await m.delete(NhaCungCapXacThuc, { maNguoiDung: id });
      await m.delete(NguoiDung, { maNguoiDung: id });
    });
    return { daXoaCung: true };
  }
}
