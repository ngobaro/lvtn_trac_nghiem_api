import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { PhongThi } from './entities/phong-thi.entity';
import { PhongThiBaiThi } from './entities/phong-thi-bai-thi.entity';
import { ThanhVienPhong } from './entities/thanh-vien-phong.entity';
import { BaiThi } from '../exams/entities/bai-thi.entity';
import { GhiDanh } from '../enrollments/entities/ghi-danh.entity';
import { MonHocHocKy } from '../subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { CreateExamRoomDto } from './dto/create-exam-room.dto';
import { UpdateExamRoomDto } from './dto/update-exam-room.dto';
import { QueryExamRoomDto } from './dto/query-exam-room.dto';
import { TrangThaiBaiThi } from '../../common/enums/trang-thai-bai-thi.enum';
import { TrangThaiPhongThi } from '../../common/enums/trang-thai-phong-thi.enum';
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
    @InjectRepository(ThanhVienPhong)
    private thanhVienRepo: Repository<ThanhVienPhong>,
    @InjectRepository(BaiThi) private baiThiRepo: Repository<BaiThi>,
    @InjectRepository(GhiDanh) private ghiDanhRepo: Repository<GhiDanh>,
    @InjectRepository(MonHocHocKy) private mhhkRepo: Repository<MonHocHocKy>,
    private dataSource: DataSource,
    private examSessionsService: ExamSessionsService,
  ) {}

  // Admin: danh sách tất cả phòng (đang hoạt động).
  async findAll(query: QueryExamRoomDto) {
    const { page = 1, limit = 10, search, maMonHocHocKy, trangThai } = query;

    await this.dongBoNhieuPhong();

    const qb = this.phongThiRepo
      .createQueryBuilder('pt')
      .leftJoinAndSelect('pt.monHocHocKy', 'mhhk')
      .leftJoinAndSelect('mhhk.monHoc', 'monHoc')
      .leftJoinAndSelect('mhhk.hocKy', 'hocKy')
      .where('pt.laHoatDong = :hd', { hd: true });

    if (search) qb.andWhere('pt.tenPhongThi LIKE :s', { s: `%${search}%` });
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

  // Học sinh: danh sách phòng thuộc các môn-học-kỳ mình đã ghi danh.
  async findAllForHocSinh(maHocSinh: number) {
    await this.dongBoNhieuPhong();

    const maMhhk = await this.layMonHocHocKyDaGhiDanh(maHocSinh);
    if (maMhhk.length === 0) return { items: [], total: 0 };

    const items = await this.phongThiRepo
      .createQueryBuilder('pt')
      .leftJoinAndSelect('pt.monHocHocKy', 'mhhk')
      .leftJoinAndSelect('mhhk.monHoc', 'monHoc')
      .leftJoinAndSelect('mhhk.hocKy', 'hocKy')
      .where('pt.laHoatDong = :hd', { hd: true })
      .andWhere('pt.maMonHocHocKy IN (:...maMhhk)', { maMhhk })
      .orderBy('pt.moLuc', 'DESC')
      .getMany();
    return { items, total: items.length };
  }

  private async layMonHocHocKyDaGhiDanh(maHocSinh: number): Promise<number[]> {
    const ds = await this.ghiDanhRepo.find({
      where: { maHocSinh },
      select: { maMonHocHocKy: true },
    });
    return ds.map((g) => g.maMonHocHocKy);
  }

  async findOne(id: number) {
    const phongThi = await this.phongThiRepo.findOne({
      where: { maPhongThi: id },
      relations: {
        monHocHocKy: { monHoc: true, hocKy: true },
        phongThiBaiThis: { baiThi: { nguoiTao: true } },
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

  async create(dto: CreateExamRoomDto, taoBoi: number) {
    const moLuc = new Date(dto.moLuc);
    if (moLuc < new Date())
      throw new BadRequestException('Thời gian mở phòng không được ở quá khứ');

    await this.kiemTraMonHocHocKy(dto.maMonHocHocKy);
    await this.kiemTraDsBaiThi(dto.maBaiThis, dto.maMonHocHocKy);
    await this.kiemTraThoiLuong(dto.thoiGianLamBai, dto.maBaiThis);

    // Thi đồng loạt: giờ đóng phòng = giờ mở + thời lượng làm bài (cấp phòng).
    const dongLuc = new Date(moLuc.getTime() + dto.thoiGianLamBai * 60000);

    return this.dataSource.transaction(async (em) => {
      const phongThi = await em.save(
        PhongThi,
        em.create(PhongThi, {
          maMonHocHocKy: dto.maMonHocHocKy,
          tenPhongThi: dto.tenPhongThi,
          cheDoCauHoi: dto.cheDoCauHoi,
          thoiGianLamBai: dto.thoiGianLamBai,
          moLuc,
          dongLuc,
          soNguoiThamGia: dto.soNguoiThamGia,
          laHoatDong: true,
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

      return phongThi.maPhongThi;
    }).then((maPhongThi) => this.findOne(maPhongThi));
  }

  async update(id: number, dto: UpdateExamRoomDto) {
    const phong = await this.findOne(id);

    // Chỉ cho sửa khi phòng chưa mở và chưa có thành viên (giữ toàn vẹn kỳ thi).
    if (phong.trangThai !== TrangThaiPhongThi.DANG_CHO)
      throw new BadRequestException('Chỉ sửa được phòng đang chờ mở');
    if (phong.thanhViens?.length)
      throw new BadRequestException('Không thể sửa phòng đã có người tham gia');

    const moLuc = dto.moLuc ? new Date(dto.moLuc) : phong.moLuc;
    if (dto.moLuc && moLuc < new Date())
      throw new BadRequestException('Thời gian mở phòng không được ở quá khứ');
    const thoiGianLamBai = dto.thoiGianLamBai ?? phong.thoiGianLamBai;
    const dongLuc = new Date(moLuc.getTime() + thoiGianLamBai * 60000);

    if (dto.maBaiThis)
      await this.kiemTraDsBaiThi(dto.maBaiThis, phong.maMonHocHocKy);

    const dsBaiThi = dto.maBaiThis ?? phong.phongThiBaiThis.map((x) => x.maBaiThi);
    await this.kiemTraThoiLuong(thoiGianLamBai, dsBaiThi);

    return this.dataSource.transaction(async (em) => {
      await em.update(PhongThi, id, {
        tenPhongThi: dto.tenPhongThi ?? phong.tenPhongThi,
        cheDoCauHoi: dto.cheDoCauHoi ?? phong.cheDoCauHoi,
        thoiGianLamBai,
        moLuc,
        dongLuc,
        soNguoiThamGia: dto.soNguoiThamGia ?? phong.soNguoiThamGia,
      });

      if (dto.maBaiThis) {
        await em.delete(PhongThiBaiThi, { maPhongThi: id });
        await em.save(
          PhongThiBaiThi,
          dto.maBaiThis.map((maBaiThi) =>
            em.create(PhongThiBaiThi, { maPhongThi: id, maBaiThi }),
          ),
        );
      }

      return id;
    }).then(() => this.findOne(id));
  }

  // Xóa mềm.
  async remove(id: number) {
    const phong = await this.phongThiRepo.findOne({
      where: { maPhongThi: id },
    });
    if (!phong) throw new NotFoundException('Phòng thi không tồn tại');
    phong.laHoatDong = false;
    await this.phongThiRepo.save(phong);
    return null;
  }

  async updateStatus(id: number, trangThai: TrangThaiPhongThi) {
    const phongThi = await this.findOne(id);

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

  async getMembers(id: number) {
    await this.findOne(id);
    return this.thanhVienRepo.find({
      where: { maPhongThi: id },
      relations: { nguoiDung: true },
    });
  }

  private async kiemTraMonHocHocKy(maMonHocHocKy: number) {
    const mhhk = await this.mhhkRepo.findOne({ where: { maMonHocHocKy } });
    if (!mhhk)
      throw new BadRequestException('Môn học của học kỳ không tồn tại');
  }

  // Mọi đề phải tồn tại, đã công khai và thuộc đúng môn-học-kỳ của phòng.
  private async kiemTraDsBaiThi(maBaiThis: number[], maMonHocHocKy: number) {
    const ids = [...new Set(maBaiThis)];
    if (ids.length !== maBaiThis.length)
      throw new BadRequestException('Danh sách đề thi bị trùng');

    const hopLe = await this.baiThiRepo.countBy({
      maBaiThi: In(ids),
      maMonHocHocKy,
      trangThai: TrangThaiBaiThi.CONG_KHAI,
    });
    if (hopLe !== ids.length)
      throw new BadRequestException(
        'Một số đề thi không tồn tại, chưa công khai hoặc không thuộc môn học của học kỳ này',
      );
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
