import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { randomInt } from 'crypto';
import { PhongThi } from './entities/phong-thi.entity';
import { PhongThiBaiThi } from './entities/phong-thi-bai-thi.entity';
import { PhongThiHocSinh } from './entities/phong-thi-hoc-sinh.entity';
import { ThanhVienPhong } from './entities/thanh-vien-phong.entity';
import { BaiThi } from '../exams/entities/bai-thi.entity';
import { GhiDanh } from '../enrollments/entities/ghi-danh.entity';
import { MonHocHocKy } from '../subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { PhanCongGiangDay } from '../teaching-assignments/entities/phan-cong-giang-day.entity';
import { CreateExamRoomDto } from './dto/create-exam-room.dto';
import { UpdateExamRoomDto } from './dto/update-exam-room.dto';
import { QueryExamRoomDto } from './dto/query-exam-room.dto';
import { JoinByCodeDto } from './dto/join-by-code.dto';
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { HinhThucThamGia } from '../../common/enums/hinh-thuc-tham-gia.enum';
import { TrangThaiBaiThi } from '../../common/enums/trang-thai-bai-thi.enum';
import { TrangThaiPhongThi } from '../../common/enums/trang-thai-phong-thi.enum';
import { TrangThaiThanhVien } from '../../common/enums/trang-thai-thanh-vien.enum';
import { ExamSessionsService } from '../exam-sessions/exam-sessions.service';

// Các bước chuyển trạng thái phòng thi hợp lệ
const TRANSITIONS: Record<TrangThaiPhongThi, TrangThaiPhongThi[]> = {
  [TrangThaiPhongThi.DANG_CHO]: [
    TrangThaiPhongThi.DANG_DIEN_RA,
    TrangThaiPhongThi.DA_DONG,
  ],
  [TrangThaiPhongThi.DANG_DIEN_RA]: [TrangThaiPhongThi.DA_DONG],
  [TrangThaiPhongThi.DA_DONG]: [],
};

// Thứ tự tiến của trạng thái phòng (chỉ cho phép tiến tới, không lùi).
const THU_TU_TRANG_THAI: Record<TrangThaiPhongThi, number> = {
  [TrangThaiPhongThi.DANG_CHO]: 0,
  [TrangThaiPhongThi.DANG_DIEN_RA]: 1,
  [TrangThaiPhongThi.DA_DONG]: 2,
};

@Injectable()
export class ExamRoomsService {
  private readonly logger = new Logger(ExamRoomsService.name);

  constructor(
    @InjectRepository(PhongThi) private phongThiRepo: Repository<PhongThi>,
    @InjectRepository(PhongThiBaiThi)
    private phongThiBaiThiRepo: Repository<PhongThiBaiThi>,
    @InjectRepository(PhongThiHocSinh)
    private phongThiHocSinhRepo: Repository<PhongThiHocSinh>,
    @InjectRepository(ThanhVienPhong)
    private thanhVienRepo: Repository<ThanhVienPhong>,
    @InjectRepository(BaiThi) private baiThiRepo: Repository<BaiThi>,
    @InjectRepository(GhiDanh) private ghiDanhRepo: Repository<GhiDanh>,
    @InjectRepository(MonHocHocKy) private mhhkRepo: Repository<MonHocHocKy>,
    @InjectRepository(PhanCongGiangDay)
    private phanCongRepo: Repository<PhanCongGiangDay>,
    private dataSource: DataSource,
    private examSessionsService: ExamSessionsService,
  ) {}

  // Admin thấy mọi phòng; giáo viên chỉ thấy phòng do mình tạo.
  // taoBoi = undefined => admin, không lọc theo người tạo.
  async findAll(query: QueryExamRoomDto, taoBoi?: number) {
    const { page = 1, limit = 10, search, maMonHocHocKy, trangThai } = query;

    await this.dongBoNhieuPhong();

    const qb = this.phongThiRepo
      .createQueryBuilder('pt')
      .leftJoinAndSelect('pt.monHocHocKy', 'mhhk')
      .leftJoinAndSelect('mhhk.monHoc', 'monHoc')
      .leftJoinAndSelect('mhhk.hocKy', 'hocKy')
      .leftJoinAndSelect('pt.nguoiTao', 'nguoiTao');

    if (taoBoi !== undefined) qb.andWhere('pt.taoBoi = :taoBoi', { taoBoi });
    if (search)
      qb.andWhere('pt.tenPhongThi LIKE :s', { s: `%${search.trim()}%` });
    if (maMonHocHocKy !== undefined)
      qb.andWhere('pt.maMonHocHocKy = :maMonHocHocKy', { maMonHocHocKy });
    if (trangThai) qb.andWhere('pt.trangThai = :trangThai', { trangThai });

    const [items, total] = await qb
      .orderBy('pt.maPhongThi', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  // Học sinh: danh sách phòng mình được Admin gán vào (theo PHONG_THI_HOC_SINH).
  async findAllForHocSinh(maHocSinh: number) {
    await this.dongBoNhieuPhong();

    const items = await this.phongThiRepo
      .createQueryBuilder('pt')
      .innerJoin('pt.phongThiHocSinhs', 'pths', 'pths.maHocSinh = :maHocSinh', {
        maHocSinh,
      })
      .leftJoinAndSelect('pt.monHocHocKy', 'mhhk')
      .leftJoinAndSelect('mhhk.monHoc', 'monHoc')
      .leftJoinAndSelect('mhhk.hocKy', 'hocKy')
      .orderBy('pt.moLuc', 'DESC')
      .getMany();
    // Mã tham gia là bí mật vận hành của Admin — không trả về cho học sinh.
    return {
      items: items.map((p) => this.anMaThamGia(p)),
      total: items.length,
    };
  }

  // Che mã tham gia với người dùng không phải Admin.
  anMaThamGia(phong: PhongThi): PhongThi {
    return { ...phong, maThamGia: null };
  }

  async findOne(id: number) {
    const phongThi = await this.phongThiRepo.findOne({
      where: { maPhongThi: id },
      relations: {
        monHocHocKy: { monHoc: true, hocKy: true },
        nguoiTao: true,
        phongThiBaiThis: { baiThi: { nguoiTao: true } },
        phongThiHocSinhs: { hocSinh: true },
        thanhViens: { nguoiDung: true },
      },
    });
    if (!phongThi) throw new NotFoundException('Phòng thi không tồn tại');

    await this.dongBoMotPhong(phongThi);
    return phongThi;
  }

  // Trạng thái phòng nên có theo mốc thời gian hiện tại.
  private trangThaiTheoThoiGian(
    phong: PhongThi,
    now = new Date(),
  ): TrangThaiPhongThi {
    if (now < phong.moLuc) return TrangThaiPhongThi.DANG_CHO;
    if (now < phong.dongLuc) return TrangThaiPhongThi.DANG_DIEN_RA;
    return TrangThaiPhongThi.DA_DONG;
  }

  private async dongBoMotPhong(phong: PhongThi): Promise<PhongThi> {
    if (phong.trangThai === TrangThaiPhongThi.DA_DONG) return phong;
    const mucTieu = this.trangThaiTheoThoiGian(phong);
    if (THU_TU_TRANG_THAI[mucTieu] <= THU_TU_TRANG_THAI[phong.trangThai])
      return phong;

    await this.phongThiRepo.update(phong.maPhongThi, { trangThai: mucTieu });
    phong.trangThai = mucTieu;
    if (mucTieu === TrangThaiPhongThi.DA_DONG)
      await this.examSessionsService.chotBaiLamCuaPhong(phong.maPhongThi);
    return phong;
  }

  private async dongBoNhieuPhong() {
    const now = new Date();

    await this.phongThiRepo
      .createQueryBuilder()
      .update(PhongThi)
      .set({ trangThai: TrangThaiPhongThi.DANG_DIEN_RA })
      .where('trangThai = :cho', { cho: TrangThaiPhongThi.DANG_CHO })
      .andWhere('moLuc <= :now', { now })
      .andWhere('dongLuc > :now', { now })
      .execute();

    const hetHan = await this.phongThiRepo
      .createQueryBuilder('pt')
      .where('pt.trangThai != :dong', { dong: TrangThaiPhongThi.DA_DONG })
      .andWhere('pt.dongLuc <= :now', { now })
      .getMany();
    for (const p of hetHan) {
      await this.phongThiRepo.update(p.maPhongThi, {
        trangThai: TrangThaiPhongThi.DA_DONG,
      });
      await this.examSessionsService.chotBaiLamCuaPhong(p.maPhongThi);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async tuDongDongBoTrangThai() {
    try {
      await this.dongBoNhieuPhong();
    } catch (e) {
      this.logger.error(
        `Đồng bộ trạng thái phòng thất bại: ${(e as Error).message}`,
      );
    }
  }

  async create(dto: CreateExamRoomDto, user: CurrentUserPayload) {
    const moLuc = new Date(dto.moLuc);
    if (moLuc < new Date())
      throw new BadRequestException('Thời gian mở phòng không được ở quá khứ');

    // Giáo viên: chỉ mở phòng dùng mã tham gia, chỉ cho môn mình được phân dạy,
    // và chỉ đưa đề do chính mình tạo vào phòng.
    const taoBoi = user.maNguoiDung;
    const laGiaoVien = user.vaiTro === VaiTro.GIAO_VIEN;
    if (laGiaoVien) {
      if (dto.hinhThucThamGia !== HinhThucThamGia.MA_THAM_GIA)
        throw new BadRequestException(
          'Giáo viên chỉ tạo được phòng dùng mã tham gia',
        );
      await this.kiemTraPhanCong(dto.maMonHocHocKy, taoBoi);
    }

    await this.kiemTraMonHocHocKy(dto.maMonHocHocKy);
    await this.kiemTraTrungTen(dto.tenPhongThi, dto.maMonHocHocKy);
    await this.kiemTraDsBaiThi(
      dto.maBaiThis,
      dto.maMonHocHocKy,
      laGiaoVien ? taoBoi : undefined,
    );
    await this.kiemTraThoiLuong(dto.thoiGianLamBai, dto.maBaiThis);

    // Chế độ mã tham gia: phòng mở rỗng, HS tự nhập mã để vào (ghi dòng
    // PHONG_THI_HOC_SINH lúc đó). Chế độ gán tay: bắt buộc có danh sách HS.
    const dungMaThamGia = dto.hinhThucThamGia === HinhThucThamGia.MA_THAM_GIA;
    const dsHocSinh = dungMaThamGia ? [] : (dto.maHocSinhs ?? []);
    if (!dungMaThamGia) {
      if (dsHocSinh.length === 0)
        throw new BadRequestException(
          'Vui lòng gán ít nhất 1 học sinh vào phòng',
        );
      await this.kiemTraDsHocSinh(dsHocSinh, dto.maMonHocHocKy);
    }
    const maThamGia = dungMaThamGia ? await this.sinhMaThamGia() : null;

    // Thi đồng loạt: giờ đóng phòng = giờ mở + thời lượng làm bài (cấp phòng).
    const dongLuc = new Date(moLuc.getTime() + dto.thoiGianLamBai * 60000);

    return this.dataSource
      .transaction(async (em) => {
        const phongThi = await em.save(
          PhongThi,
          em.create(PhongThi, {
            maMonHocHocKy: dto.maMonHocHocKy,
            tenPhongThi: dto.tenPhongThi,
            cheDoCauHoi: dto.cheDoCauHoi,
            hinhThucThamGia: dto.hinhThucThamGia,
            maThamGia,
            thoiGianLamBai: dto.thoiGianLamBai,
            moLuc,
            dongLuc,
            trangThai: TrangThaiPhongThi.DANG_CHO,
            taoBoi,
          }),
        );

        await em.save(
          PhongThiBaiThi,
          dto.maBaiThis.map((maBaiThi) =>
            em.create(PhongThiBaiThi, {
              maPhongThi: phongThi.maPhongThi,
              maBaiThi,
            }),
          ),
        );

        await em.save(
          PhongThiHocSinh,
          dsHocSinh.map((maHocSinh) =>
            em.create(PhongThiHocSinh, {
              maPhongThi: phongThi.maPhongThi,
              maHocSinh,
            }),
          ),
        );

        return phongThi.maPhongThi;
      })
      .then((maPhongThi) => this.findOne(maPhongThi));
  }

  async update(id: number, dto: UpdateExamRoomDto, user: CurrentUserPayload) {
    const phong = await this.findOne(id);
    this.kiemTraQuyenQuanLy(phong, user.maNguoiDung);

    // Chỉ cho sửa khi phòng đang chờ mở (giữ toàn vẹn kỳ thi). Phòng DANG_CHO
    // chưa mở nên chưa thể có người tham gia.
    if (phong.trangThai !== TrangThaiPhongThi.DANG_CHO)
      throw new BadRequestException('Chỉ sửa được phòng đang chờ mở');

    const laGiaoVien = user.vaiTro === VaiTro.GIAO_VIEN;

    const moLuc = dto.moLuc ? new Date(dto.moLuc) : phong.moLuc;
    if (dto.moLuc && moLuc < new Date())
      throw new BadRequestException('Thời gian mở phòng không được ở quá khứ');
    const thoiGianLamBai = dto.thoiGianLamBai ?? phong.thoiGianLamBai;
    const dongLuc = new Date(moLuc.getTime() + thoiGianLamBai * 60000);

    const tenPhongThi = dto.tenPhongThi ?? phong.tenPhongThi;
    await this.kiemTraTrungTen(tenPhongThi, phong.maMonHocHocKy, id);

    if (dto.maBaiThis)
      await this.kiemTraDsBaiThi(
        dto.maBaiThis,
        phong.maMonHocHocKy,
        laGiaoVien ? user.maNguoiDung : undefined,
      );

    const dsBaiThi =
      dto.maBaiThis ?? phong.phongThiBaiThis.map((x) => x.maBaiThi);
    await this.kiemTraThoiLuong(thoiGianLamBai, dsBaiThi);

    // Đổi hình thức tham gia (chỉ khi phòng chưa mở). Lưu ý: ở chế độ mã tham
    // gia, PHONG_THI_HOC_SINH chính là danh sách HS đã nhập mã — chỉ được xóa
    // đúng lúc hình thức thay đổi, tuyệt đối không đụng vào ở lần sửa khác.
    const hinhThuc = dto.hinhThucThamGia ?? phong.hinhThucThamGia;
    const doiHinhThuc = hinhThuc !== phong.hinhThucThamGia;
    const dungMaThamGia = hinhThuc === HinhThucThamGia.MA_THAM_GIA;

    if (laGiaoVien && !dungMaThamGia)
      throw new BadRequestException(
        'Giáo viên chỉ dùng được hình thức mã tham gia',
      );

    let maThamGia = phong.maThamGia;
    if (dungMaThamGia) {
      if (dto.maHocSinhs)
        throw new BadRequestException(
          'Phòng dùng mã tham gia không nhận danh sách học sinh gán tay',
        );
      maThamGia = phong.maThamGia ?? (await this.sinhMaThamGia());
    } else {
      maThamGia = null;
      if (doiHinhThuc && !dto.maHocSinhs?.length)
        throw new BadRequestException(
          'Vui lòng gán ít nhất 1 học sinh vào phòng',
        );
    }

    if (dto.maHocSinhs)
      await this.kiemTraDsHocSinh(dto.maHocSinhs, phong.maMonHocHocKy, id);

    return this.dataSource
      .transaction(async (em) => {
        await em.update(PhongThi, id, {
          tenPhongThi: dto.tenPhongThi ?? phong.tenPhongThi,
          cheDoCauHoi: dto.cheDoCauHoi ?? phong.cheDoCauHoi,
          hinhThucThamGia: hinhThuc,
          maThamGia,
          thoiGianLamBai,
          moLuc,
          dongLuc,
        });

        // Chuyển sang mã tham gia: danh sách gán tay cũ không còn ý nghĩa.
        if (doiHinhThuc && dungMaThamGia)
          await em.delete(PhongThiHocSinh, { maPhongThi: id });

        if (dto.maBaiThis) {
          await em.delete(PhongThiBaiThi, { maPhongThi: id });
          await em.save(
            PhongThiBaiThi,
            dto.maBaiThis.map((maBaiThi) =>
              em.create(PhongThiBaiThi, { maPhongThi: id, maBaiThi }),
            ),
          );
        }

        if (dto.maHocSinhs) {
          await em.delete(PhongThiHocSinh, { maPhongThi: id });
          await em.save(
            PhongThiHocSinh,
            dto.maHocSinhs.map((maHocSinh) =>
              em.create(PhongThiHocSinh, { maPhongThi: id, maHocSinh }),
            ),
          );
        }

        return id;
      })
      .then(() => this.findOne(id));
  }

  // Xóa cứng — chỉ cho phòng CHƯA bắt đầu (DANG_CHO). Phòng đang diễn ra hoặc
  // đã đóng thì chặn (giữ toàn vẹn bài làm/lịch sử). findOne đồng bộ trạng thái
  // theo thời gian trước khi kiểm tra. Phòng DANG_CHO chưa mở nên chưa có bài
  // làm/thành viên; xóa tường minh các bảng nối trong transaction (không dựa
  // vào FK cascade vì TiDB có thể không thực thi).
  async remove(id: number, user: CurrentUserPayload) {
    const phong = await this.findOne(id);
    this.kiemTraQuyenQuanLy(phong, user.maNguoiDung);
    if (phong.trangThai !== TrangThaiPhongThi.DANG_CHO)
      throw new BadRequestException('Chỉ xóa được phòng chưa bắt đầu');

    await this.dataSource.transaction(async (em) => {
      await em.delete(ThanhVienPhong, { maPhongThi: id });
      await em.delete(PhongThiBaiThi, { maPhongThi: id });
      await em.delete(PhongThiHocSinh, { maPhongThi: id });
      await em.delete(PhongThi, id);
    });
    return null;
  }

  async updateStatus(
    id: number,
    trangThai: TrangThaiPhongThi,
    user: CurrentUserPayload,
  ) {
    const phongThi = await this.findOne(id);
    this.kiemTraQuyenQuanLy(phongThi, user.maNguoiDung);

    if (phongThi.trangThai === trangThai) return phongThi;
    if (!TRANSITIONS[phongThi.trangThai].includes(trangThai))
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ "${phongThi.trangThai}" sang "${trangThai}"`,
      );

    // Mở sớm: dời cửa sổ thi về hiện tại để thí sinh có đủ thời lượng.
    const now = new Date();
    if (trangThai === TrangThaiPhongThi.DANG_DIEN_RA && now < phongThi.moLuc) {
      phongThi.moLuc = now;
      phongThi.dongLuc = new Date(
        now.getTime() + phongThi.thoiGianLamBai * 60000,
      );
    }

    phongThi.trangThai = trangThai;
    const daLuu = await this.phongThiRepo.save(phongThi);

    if (trangThai === TrangThaiPhongThi.DA_DONG)
      await this.examSessionsService.chotBaiLamCuaPhong(phongThi.maPhongThi);

    return daLuu;
  }

  // Thành viên phòng = TẤT CẢ học sinh được gán vào phòng (PHONG_THI_HOC_SINH),
  // trái-nối với THANH_VIEN_PHONG để suy ra trạng thái tham gia. Em nào chưa có
  // bản ghi tham gia (chưa vào thi) -> VANG_MAT (không lưu DB), để Admin
  // biết ai vắng mặt.
  async getMembers(id: number, user: CurrentUserPayload) {
    const phong = await this.findOne(id);
    // Admin xem được mọi phòng; giáo viên chỉ phòng do mình tạo.
    if (user.vaiTro !== VaiTro.QUAN_TRI_VIEN)
      this.kiemTraQuyenQuanLy(phong, user.maNguoiDung);

    const dsGan = await this.phongThiHocSinhRepo.find({
      where: { maPhongThi: id },
      relations: { hocSinh: true },
    });
    const dsThanhVien = await this.thanhVienRepo.find({
      where: { maPhongThi: id },
    });
    const mapTV = new Map(dsThanhVien.map((tv) => [tv.maNguoiDung, tv]));

    return dsGan
      .map((g) => {
        const tv = mapTV.get(g.maHocSinh);
        return {
          maHocSinh: g.maHocSinh,
          maThanhVien: tv?.maThanhVien ?? null,
          nguoiDung: g.hocSinh,
          trangThai: tv ? tv.trangThai : TrangThaiThanhVien.VANG_MAT,
        };
      })
      .sort((a, b) =>
        (a.nguoiDung?.tenNguoiDung ?? '').localeCompare(
          b.nguoiDung?.tenNguoiDung ?? '',
        ),
      );
  }

  // Học sinh nhập mã để vào phòng. Nhập đúng -> ghi 1 dòng PHONG_THI_HOC_SINH,
  // từ đó mọi luồng sẵn có (danh sách phòng, rào vào thi, điểm, vắng mặt) chạy
  // y như phòng được Admin gán. Vẫn giữ nguyên ràng buộc học vụ.
  async thamGiaBangMa(dto: JoinByCodeDto, maHocSinh: number) {
    const ma = dto.maThamGia.trim().toUpperCase();

    // Chỉ tìm trong phòng CHƯA kết thúc (mã được tái dùng sau khi phòng đóng).
    const phong = await this.phongThiRepo
      .createQueryBuilder('pt')
      .where('pt.maThamGia = :ma', { ma })
      .andWhere('pt.hinhThucThamGia = :ht', {
        ht: HinhThucThamGia.MA_THAM_GIA,
      })
      .andWhere('pt.trangThai != :dong', { dong: TrangThaiPhongThi.DA_DONG })
      .andWhere('pt.dongLuc > :now', { now: new Date() })
      .getOne();
    if (!phong)
      throw new NotFoundException(
        'Mã tham gia không đúng hoặc phòng thi đã kết thúc',
      );

    const daCo = await this.phongThiHocSinhRepo.findOne({
      where: { maPhongThi: phong.maPhongThi, maHocSinh },
    });

    if (!daCo) {
      // Tái dùng nguyên bộ kiểm tra của luồng gán tay: phải đã ghi danh
      // môn-học-kỳ và chưa ở phòng khác của cùng môn.
      await this.kiemTraDsHocSinh(
        [maHocSinh],
        phong.maMonHocHocKy,
        phong.maPhongThi,
      );
      try {
        await this.phongThiHocSinhRepo.save(
          this.phongThiHocSinhRepo.create({
            maPhongThi: phong.maPhongThi,
            maHocSinh,
          }),
        );
      } catch (e) {
        // Hai request nhập mã gần như đồng thời: unique index chặn bản ghi thứ
        // hai -> coi như đã vào phòng, không báo lỗi.
        if (!this.laLoiTrungKhoa(e)) throw e;
      }
    }

    // Trả payload gọn: findOne kèm quan hệ sẽ lộ danh sách bạn cùng phòng.
    return {
      maPhongThi: phong.maPhongThi,
      tenPhongThi: phong.tenPhongThi,
      trangThai: phong.trangThai,
      moLuc: phong.moLuc,
      dongLuc: phong.dongLuc,
      daThamGiaTruocDo: !!daCo,
    };
  }

  // Bảng chữ bỏ ký tự dễ đọc nhầm khi chép tay: 0/O, 1/I.
  private static readonly BANG_CHU_MA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  private async sinhMaThamGia(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const ma = Array.from(
        { length: 6 },
        () =>
          ExamRoomsService.BANG_CHU_MA[
            randomInt(ExamRoomsService.BANG_CHU_MA.length)
          ],
      ).join('');
      if (!(await this.maDangDuocDung(ma))) return ma;
    }
    throw new BadRequestException(
      'Không sinh được mã tham gia, vui lòng thử lại',
    );
  }

  // Mã chỉ cần độc nhất giữa các phòng CHƯA kết thúc (giống kiemTraTrungTen).
  private maDangDuocDung(ma: string) {
    return this.phongThiRepo
      .createQueryBuilder('pt')
      .where('pt.maThamGia = :ma', { ma })
      .andWhere('pt.trangThai != :dong', { dong: TrangThaiPhongThi.DA_DONG })
      .andWhere('pt.dongLuc > :now', { now: new Date() })
      .getExists();
  }

  private laLoiTrungKhoa(e: unknown): boolean {
    const loi = e as {
      code?: string;
      errno?: number;
      driverError?: { errno?: number };
    };
    return (
      loi?.code === 'ER_DUP_ENTRY' ||
      loi?.errno === 1062 ||
      loi?.driverError?.errno === 1062
    );
  }

  // Quyền quản lý phòng (sửa/đóng/xóa) thuần theo người tạo: Admin cũng không
  // can thiệp vào phòng của giáo viên và ngược lại.
  private kiemTraQuyenQuanLy(phong: PhongThi, maNguoiDung: number) {
    if (phong.taoBoi !== maNguoiDung)
      throw new ForbiddenException(
        'Bạn chỉ quản lý được phòng thi do mình tạo',
      );
  }

  // Kiểm tra giáo viên có được phân dạy môn-học-kỳ này không.
  private async kiemTraPhanCong(maMonHocHocKy: number, maGiaoVien: number) {
    const pc = await this.phanCongRepo.findOne({
      where: { maMonHocHocKy, maGiaoVien },
    });
    if (!pc)
      throw new BadRequestException(
        'Bạn không được phân dạy môn học của học kỳ này',
      );
  }

  private async kiemTraMonHocHocKy(maMonHocHocKy: number) {
    const mhhk = await this.mhhkRepo.findOne({ where: { maMonHocHocKy } });
    if (!mhhk)
      throw new BadRequestException('Môn học của học kỳ không tồn tại');
  }

  // Mọi đề phải tồn tại, đã công khai và thuộc đúng môn-học-kỳ của phòng.
  // taoBoi: giáo viên chỉ được đưa đề do chính mình tạo vào phòng (Admin bỏ qua).
  private async kiemTraDsBaiThi(
    maBaiThis: number[],
    maMonHocHocKy: number,
    taoBoi?: number,
  ) {
    const ids = [...new Set(maBaiThis)];
    if (ids.length !== maBaiThis.length)
      throw new BadRequestException('Danh sách đề thi bị trùng');

    const hopLe = await this.baiThiRepo.countBy({
      maBaiThi: In(ids),
      maMonHocHocKy,
      trangThai: TrangThaiBaiThi.CONG_KHAI,
      ...(taoBoi !== undefined ? { taoBoi } : {}),
    });
    if (hopLe !== ids.length)
      throw new BadRequestException(
        taoBoi !== undefined
          ? 'Một số đề thi không tồn tại, chưa công khai, không thuộc môn học của học kỳ này hoặc không do bạn tạo'
          : 'Một số đề thi không tồn tại, chưa công khai hoặc không thuộc môn học của học kỳ này',
      );
  }

  // Mọi HS gán vào phòng phải đã ghi danh môn-học-kỳ và chưa ở phòng khác cùng
  // môn (mỗi HS chỉ ở 1 phòng của mỗi môn-học-kỳ). maPhongThiBoQua: phòng đang
  // sửa (loại chính nó khỏi kiểm tra trùng).
  private async kiemTraDsHocSinh(
    maHocSinhs: number[],
    maMonHocHocKy: number,
    maPhongThiBoQua?: number,
  ) {
    const ids = [...new Set(maHocSinhs)];
    if (ids.length !== maHocSinhs.length)
      throw new BadRequestException('Danh sách học sinh bị trùng');

    const daGhiDanh = await this.ghiDanhRepo.countBy({
      maHocSinh: In(ids),
      maMonHocHocKy,
    });
    if (daGhiDanh !== ids.length)
      throw new BadRequestException(
        'Một số học sinh chưa được ghi danh vào môn học của học kỳ này',
      );

    // HS đã được gán vào phòng khác (còn hoạt động) của cùng môn-học-kỳ.
    const qb = this.phongThiHocSinhRepo
      .createQueryBuilder('pths')
      .innerJoin('pths.phongThi', 'pt')
      .innerJoinAndSelect('pths.hocSinh', 'hs')
      .where('pths.maHocSinh IN (:...ids)', { ids })
      .andWhere('pt.maMonHocHocKy = :maMonHocHocKy', { maMonHocHocKy });
    if (maPhongThiBoQua !== undefined)
      qb.andWhere('pt.maPhongThi != :bo', { bo: maPhongThiBoQua });

    const trung = await qb.getMany();
    if (trung.length) {
      const ten = trung
        .map((t) => t.hocSinh?.tenNguoiDung ?? `#${t.maHocSinh}`)
        .join(', ');
      throw new BadRequestException(
        `Học sinh đã được gán vào phòng khác của môn học này: ${ten}`,
      );
    }
  }

  // Tên phòng không được trùng với phòng CHƯA kết thúc khác trong cùng học kỳ.
  // Phòng đã kết thúc (đóng thủ công DA_DONG hoặc đã quá dongLuc) thì cho trùng.
  private async kiemTraTrungTen(
    tenPhongThi: string,
    maMonHocHocKy: number,
    maPhongThiBoQua?: number,
  ) {
    const mhhk = await this.mhhkRepo.findOne({ where: { maMonHocHocKy } });
    if (!mhhk) return;

    const qb = this.phongThiRepo
      .createQueryBuilder('pt')
      .innerJoin('pt.monHocHocKy', 'mhhk')
      .where('pt.tenPhongThi = :ten', { ten: tenPhongThi.trim() })
      .andWhere('mhhk.maHocKy = :maHocKy', { maHocKy: mhhk.maHocKy })
      .andWhere('pt.trangThai != :dong', { dong: TrangThaiPhongThi.DA_DONG })
      .andWhere('pt.dongLuc > :now', { now: new Date() });
    if (maPhongThiBoQua !== undefined)
      qb.andWhere('pt.maPhongThi != :bo', { bo: maPhongThiBoQua });

    const trung = await qb.getExists();
    if (trung)
      throw new BadRequestException(
        'Tên phòng thi đã tồn tại trong học kỳ này',
      );
  }

  // Danh sách maHocSinh đã được gán vào phòng (còn hoạt động) của môn-học-kỳ,
  // dùng để FE ẩn khỏi picker. excludePhongThi: loại phòng đang sửa.
  async layHocSinhDaGan(
    maMonHocHocKy: number,
    excludePhongThi?: number,
  ): Promise<number[]> {
    const qb = this.phongThiHocSinhRepo
      .createQueryBuilder('pths')
      .innerJoin('pths.phongThi', 'pt')
      .select('DISTINCT pths.maHocSinh', 'maHocSinh')
      .where('pt.maMonHocHocKy = :m', { m: maMonHocHocKy });
    if (excludePhongThi !== undefined)
      qb.andWhere('pt.maPhongThi != :ex', { ex: excludePhongThi });

    const rows = await qb.getRawMany<{ maHocSinh: number }>();
    return rows.map((r) => Number(r.maHocSinh));
  }

  // Thời lượng phòng phải đủ cho đề dài nhất (HS bốc đề nào cũng phải kịp làm).
  private async kiemTraThoiLuong(thoiGianLamBai: number, maBaiThis: number[]) {
    if (!maBaiThis.length) return;
    const kq = await this.baiThiRepo
      .createQueryBuilder('bt')
      .select('MAX(bt.thoiGianLamBai)', 'max')
      .where('bt.maBaiThi IN (:...ids)', { ids: maBaiThis })
      .getRawOne<{ max: number }>();
    const maxDe = Number(kq?.max ?? 0);
    if (thoiGianLamBai < maxDe)
      throw new BadRequestException(
        `Thời lượng phòng (${thoiGianLamBai} phút) không được nhỏ hơn thời lượng đề dài nhất trong phòng (${maxDe} phút)`,
      );
  }
}
