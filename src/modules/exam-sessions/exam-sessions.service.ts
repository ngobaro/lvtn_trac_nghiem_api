import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import { BaiLam } from './entities/bai-lam.entity';
import { CauHoiBaiLam } from './entities/cau-hoi-bai-lam.entity';
import { NguoiDungTraLoi } from './entities/nguoi-dung-tra-loi.entity';
import { PhongThi } from '../exam-rooms/entities/phong-thi.entity';
import { PhongThiBaiThi } from '../exam-rooms/entities/phong-thi-bai-thi.entity';
import { ThanhVienPhong } from '../exam-rooms/entities/thanh-vien-phong.entity';
import { GhiDanh } from '../enrollments/entities/ghi-danh.entity';
import { CauHoiBaiThi } from '../exams/entities/cau-hoi-bai-thi.entity';
import { LuaChon } from '../questions/entities/lua-chon.entity';
import { DapAn } from '../questions/entities/dap-an.entity';
import { KetQua } from '../results/entities/ket-qua.entity';
import { JoinRoomDto } from './dto/join-room.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { TrangThaiBaiLam } from '../../common/enums/trang-thai-bai-lam.enum';
import { TrangThaiPhongThi } from '../../common/enums/trang-thai-phong-thi.enum';
import { TrangThaiThanhVien } from '../../common/enums/trang-thai-thanh-vien.enum';
import { CheDoCauHoi } from '../../common/enums/che-do-cau-hoi.enum';
import { LoaiCauHoi } from '../../common/enums/loai-cau-hoi.enum';

@Injectable()
export class ExamSessionsService {
  private readonly logger = new Logger(ExamSessionsService.name);

  constructor(
    @InjectRepository(BaiLam) private baiLamRepo: Repository<BaiLam>,
    @InjectRepository(CauHoiBaiLam)
    private cauHoiBaiLamRepo: Repository<CauHoiBaiLam>,
    @InjectRepository(NguoiDungTraLoi)
    private traLoiRepo: Repository<NguoiDungTraLoi>,
    @InjectRepository(PhongThi) private phongThiRepo: Repository<PhongThi>,
    @InjectRepository(PhongThiBaiThi)
    private phongThiBaiThiRepo: Repository<PhongThiBaiThi>,
    @InjectRepository(ThanhVienPhong)
    private thanhVienRepo: Repository<ThanhVienPhong>,
    @InjectRepository(GhiDanh) private ghiDanhRepo: Repository<GhiDanh>,
    @InjectRepository(CauHoiBaiThi)
    private cauHoiBaiThiRepo: Repository<CauHoiBaiThi>,
    private dataSource: DataSource,
  ) {}

  // HS vào phòng (theo mã phòng) -> kiểm tra ghi danh -> bốc ngẫu nhiên 1 đề ->
  // tạo BAI_LAM + bộ CAU_HOI_BAI_LAM (theo cheDoCauHoi)
  async joinRoom(dto: JoinRoomDto, maNguoiDung: number) {
    const phong = await this.phongThiRepo.findOne({
      where: { maPhongThi: dto.maPhongThi },
    });
    if (!phong || !phong.laHoatDong)
      throw new NotFoundException('Phòng thi không tồn tại');

    // Quyền vào phòng dựa trên ghi danh: HS phải được ghi danh môn-học-kỳ của phòng.
    const daGhiDanh = await this.ghiDanhRepo.findOne({
      where: { maMonHocHocKy: phong.maMonHocHocKy, maHocSinh: maNguoiDung },
    });
    if (!daGhiDanh)
      throw new ForbiddenException(
        'Bạn chưa được ghi danh vào môn học của phòng thi này',
      );

    // Cho vào phòng theo thời gian (mở->đóng), đồng thời tôn trọng thao tác thủ công:
    // đóng sớm (DA_DONG) thì chặn; mở sớm (DANG_DIEN_RA) thì cho vào trước giờ mở.
    const now = new Date();
    if (phong.trangThai === TrangThaiPhongThi.DA_DONG)
      throw new BadRequestException('Phòng thi đã đóng');
    if (now > phong.dongLuc)
      throw new BadRequestException('Phòng thi đã hết thời gian');
    if (now < phong.moLuc && phong.trangThai !== TrangThaiPhongThi.DANG_DIEN_RA)
      throw new BadRequestException('Phòng thi chưa mở');

    // Đã có bài làm trong phòng này? -> resume với đúng đề đã bốc trước đó.
    const baiLamCu = await this.baiLamRepo.findOne({
      where: { maPhongThi: phong.maPhongThi, maNguoiDung },
    });
    if (baiLamCu) return this.resumeHoacChan(baiLamCu, maNguoiDung);

    // Kiểm tra giới hạn số người tham gia
    if (phong.soNguoiThamGia) {
      const soThanhVien = await this.thanhVienRepo.countBy({
        maPhongThi: phong.maPhongThi,
      });
      if (soThanhVien >= phong.soNguoiThamGia)
        throw new BadRequestException(
          'Phòng thi đã đủ số lượng người tham gia',
        );
    }

    // Bốc ngẫu nhiên 1 đề trong danh sách đề của phòng.
    const dsDe = await this.phongThiBaiThiRepo.find({
      where: { maPhongThi: phong.maPhongThi },
    });
    if (dsDe.length === 0)
      throw new BadRequestException('Phòng thi chưa có đề thi');
    const maBaiThiChon =
      dsDe[Math.floor(Math.random() * dsDe.length)].maBaiThi;

    // Lấy ngân hàng câu hỏi của đề đã bốc
    const dsCauHoi = await this.cauHoiBaiThiRepo.find({
      where: { maBaiThi: maBaiThiChon },
      order: { thuTu: 'ASC' },
    });
    if (dsCauHoi.length === 0)
      throw new BadRequestException('Đề thi chưa có câu hỏi');

    const cauHoiHienThi = this.chonCauHoi(dsCauHoi, phong);

    let maBaiLam: number;
    try {
      maBaiLam = await this.dataSource.transaction(async (em) => {
        const baiLam = await em.save(
          BaiLam,
          em.create(BaiLam, {
            maPhongThi: phong.maPhongThi,
            maBaiThi: maBaiThiChon,
            maNguoiDung,
            thoiGianBatDau: now,
            // thoiGianKetThuc = thời điểm nộp thực tế, cập nhật khi nộp bài.
            // Tạm gán = thời điểm bắt đầu (cột NOT NULL); hạn nộp lấy từ phong.dongLuc.
            thoiGianKetThuc: now,
            trangThai: TrangThaiBaiLam.DANG_LAM,
          }),
        );

        await Promise.all(
          cauHoiHienThi.map((ch, i) =>
            em.save(
              CauHoiBaiLam,
              em.create(CauHoiBaiLam, {
                maBaiLam: baiLam.maBaiLam,
                maCauHoi: ch.maCauHoi,
                thuTuHienThi: i + 1,
              }),
            ),
          ),
        );

        await em.save(
          ThanhVienPhong,
          em.create(ThanhVienPhong, {
            maPhongThi: phong.maPhongThi,
            maNguoiDung,
            trangThai: TrangThaiThanhVien.DA_THAM_GIA,
          }),
        );

        return baiLam.maBaiLam;
      });
    } catch (e) {
      // Hai request join gần như đồng thời: unique index (maPhongThi, maNguoiDung)
      // chặn bản ghi thứ hai -> lấy lại bài làm đã tạo và resume thay vì báo lỗi.
      if (this.laLoiTrungKhoa(e)) {
        const tonTai = await this.baiLamRepo.findOne({
          where: { maPhongThi: phong.maPhongThi, maNguoiDung },
        });
        if (tonTai) return this.resumeHoacChan(tonTai, maNguoiDung);
      }
      throw e;
    }

    return this.getSession(maBaiLam, maNguoiDung);
  }

  // Bài làm đã tồn tại: còn đang làm -> resume; đã nộp/hết giờ -> chặn
  private resumeHoacChan(baiLam: BaiLam, maNguoiDung: number) {
    if (baiLam.trangThai === TrangThaiBaiLam.DANG_LAM)
      return this.getSession(baiLam.maBaiLam, maNguoiDung);
    throw new BadRequestException('Bạn đã hoàn thành bài thi này');
  }

  private laLoiTrungKhoa(e: any): boolean {
    return (
      e?.code === 'ER_DUP_ENTRY' ||
      e?.errno === 1062 ||
      e?.driverError?.errno === 1062
    );
  }

  // Thông tin phiên thi + toàn bộ câu hỏi (KHÔNG kèm đáp án đúng)
  async getSession(maBaiLam: number, maNguoiDung: number) {
    const baiLam = await this.layBaiLamCuaToi(maBaiLam, maNguoiDung);

    const cauHois = await this.cauHoiBaiLamRepo.find({
      where: { maBaiLam },
      relations: { cauHoi: { luaChons: true } },
      order: { thuTuHienThi: 'ASC' },
    });

    const daTraLoi = await this.mapDaTraLoi(maBaiLam);

    const daNop = baiLam.trangThai !== TrangThaiBaiLam.DANG_LAM;
    const xaoTronDapAn = this.nenXaoTronDapAn(baiLam.phongThi.cheDoCauHoi);
    return {
      maBaiLam: baiLam.maBaiLam,
      maPhongThi: baiLam.maPhongThi,
      maBaiThi: baiLam.maBaiThi,
      tenDeThi: baiLam.baiThi.tieuDe,
      tenMonHoc: baiLam.baiThi.monHocHocKy?.monHoc?.tenMonHoc ?? null,
      trangThai: baiLam.trangThai,
      thoiGianBatDau: baiLam.thoiGianBatDau,
      hanNop: baiLam.phongThi.dongLuc,
      thoiGianNop: daNop ? baiLam.thoiGianKetThuc : null,
      thoiGianConLaiGiay: this.thoiGianConLai(baiLam),
      cauHois: cauHois.map((c) =>
        this.dinhDangCauHoi(c, daTraLoi, xaoTronDapAn),
      ),
    };
  }

  // Lấy 1 câu hỏi theo thứ tự hiển thị
  async getQuestion(
    maBaiLam: number,
    thuTuHienThi: number,
    maNguoiDung: number,
  ) {
    const baiLam = await this.layBaiLamCuaToi(maBaiLam, maNguoiDung);

    const cauHoi = await this.cauHoiBaiLamRepo.findOne({
      where: { maBaiLam, thuTuHienThi },
      relations: { cauHoi: { luaChons: true } },
    });
    if (!cauHoi) throw new NotFoundException('Không tìm thấy câu hỏi');

    const daTraLoi = await this.mapDaTraLoi(maBaiLam);
    return this.dinhDangCauHoi(
      cauHoi,
      daTraLoi,
      this.nenXaoTronDapAn(baiLam.phongThi.cheDoCauHoi),
    );
  }

  // Lưu/đổi/bỏ câu trả lời cho 1 câu hỏi
  async saveAnswer(
    maBaiLam: number,
    dto: SubmitAnswerDto,
    maNguoiDung: number,
  ) {
    const baiLam = await this.layBaiLamCuaToi(maBaiLam, maNguoiDung);
    if (baiLam.trangThai !== TrangThaiBaiLam.DANG_LAM)
      throw new BadRequestException('Bài làm đã kết thúc');
    if (new Date() > baiLam.phongThi.dongLuc)
      throw new BadRequestException('Đã hết thời gian làm bài');

    // Câu hỏi phải thuộc bộ đề của bài làm
    const cauHoiBaiLam = await this.cauHoiBaiLamRepo.findOne({
      where: { maBaiLam, maCauHoi: dto.maCauHoi },
      relations: { cauHoi: true },
    });
    if (!cauHoiBaiLam)
      throw new BadRequestException('Câu hỏi không thuộc bài làm này');

    const maLuaChons = dto.maLuaChons ?? [];
    if (
      cauHoiBaiLam.cauHoi.loaiCauHoi === LoaiCauHoi.MOT_DAP_AN &&
      maLuaChons.length > 1
    )
      throw new BadRequestException('Câu hỏi này chỉ được chọn 1 đáp án');

    // Các lựa chọn phải thuộc đúng câu hỏi
    if (maLuaChons.length > 0) {
      const hopLe = await this.dataSource.getRepository(LuaChon).countBy({
        maLuaChon: In(maLuaChons),
        maCauHoi: dto.maCauHoi,
      });
      if (hopLe !== new Set(maLuaChons).size)
        throw new BadRequestException('Lựa chọn không hợp lệ');
    }

    await this.dataSource.transaction(async (em) => {
      await em.delete(NguoiDungTraLoi, { maBaiLam, maCauHoi: dto.maCauHoi });
      for (const maLuaChon of maLuaChons) {
        await em.save(
          NguoiDungTraLoi,
          em.create(NguoiDungTraLoi, {
            maBaiLam,
            maCauHoi: dto.maCauHoi,
            maLuaChon,
          }),
        );
      }
    });

    return { maCauHoi: dto.maCauHoi, maLuaChons };
  }

  // Nộp bài thủ công -> tính điểm -> lưu KET_QUA
  async submit(maBaiLam: number, maNguoiDung: number) {
    const baiLam = await this.layBaiLamCuaToi(maBaiLam, maNguoiDung);
    if (baiLam.trangThai !== TrangThaiBaiLam.DANG_LAM)
      throw new BadRequestException('Bài làm đã được nộp');

    const ketQua = await this.finalize(maBaiLam, TrangThaiBaiLam.DA_NOP);
    if (!ketQua) throw new BadRequestException('Bài làm đã được nộp');
    return ketQua;
  }

  // Chốt bài làm một cách atomic: claim trạng thái + tính điểm + lưu KET_QUA +
  // cập nhật thành viên phòng, TẤT CẢ trong 1 transaction (all-or-nothing).
  // Nếu bất kỳ bước nào lỗi -> rollback toàn bộ, bài giữ DANG_LAM để được chốt lại.
  // Dùng chung cho nộp tay / WebSocket / cron; chống nộp trùng bằng claim trạng thái.
  private async finalize(maBaiLam: number, trangThaiMoi: TrangThaiBaiLam) {
    return this.dataSource.transaction(async (em) => {
      // Chỉ 1 tiến trình chuyển được DANG_LAM -> trạng thái cuối
      const claim = await em.update(
        BaiLam,
        { maBaiLam, trangThai: TrangThaiBaiLam.DANG_LAM },
        { trangThai: trangThaiMoi, thoiGianKetThuc: new Date() },
      );
      if (!claim.affected) return null; // tiến trình khác đã chốt

      const baiLam = await em.findOne(BaiLam, { where: { maBaiLam } });
      if (!baiLam) return null;

      const ketQua = await this.chamDiem(maBaiLam, em);
      await em.save(
        KetQua,
        em.create(KetQua, {
          maBaiLam,
          maNguoiDung: baiLam.maNguoiDung,
          maBaiThi: baiLam.maBaiThi,
          diemSo: ketQua.diemSo,
          tongSoCau: ketQua.tongSoCau,
          soCauDung: ketQua.soCauDung,
        }),
      );
      await em.update(
        ThanhVienPhong,
        { maPhongThi: baiLam.maPhongThi, maNguoiDung: baiLam.maNguoiDung },
        { trangThai: TrangThaiThanhVien.DA_NOP_BAI },
      );

      return ketQua;
    });
  }

  // ----- Dùng cho WebSocket gateway -----

  // Xác thực quyền truy cập phiên thi (ném lỗi nếu không sở hữu / không tồn tại)
  async xacThucPhien(maBaiLam: number, maNguoiDung: number) {
    return this.layBaiLamCuaToi(maBaiLam, maNguoiDung);
  }

  // Lấy số giây còn lại + trạng thái bài làm (không kiểm tra sở hữu, dùng cho tick)
  async trangThaiThoiGian(
    maBaiLam: number,
  ): Promise<{ conLaiGiay: number; trangThai: TrangThaiBaiLam } | null> {
    const baiLam = await this.baiLamRepo.findOne({
      where: { maBaiLam },
      relations: { phongThi: true },
    });
    if (!baiLam) return null;
    return {
      conLaiGiay: this.thoiGianConLai(baiLam),
      trangThai: baiLam.trangThai,
    };
  }

  // Tự động nộp bài khi hết giờ (trạng thái HET_THOI_GIAN). Bỏ qua nếu đã nộp.
  async autoSubmit(maBaiLam: number) {
    return this.finalize(maBaiLam, TrangThaiBaiLam.HET_THOI_GIAN);
  }

  // Chốt tất cả bài làm còn DANG_LAM của 1 phòng (dùng khi GV đóng phòng sớm).
  async chotBaiLamCuaPhong(maPhongThi: number) {
    const baiLams = await this.baiLamRepo.find({
      where: { maPhongThi, trangThai: TrangThaiBaiLam.DANG_LAM },
      select: { maBaiLam: true },
    });
    for (const { maBaiLam } of baiLams) {
      try {
        await this.autoSubmit(maBaiLam);
      } catch (e) {
        this.logger.error(
          `Chốt bài ${maBaiLam} khi đóng phòng thất bại: ${(e as Error).message}`,
        );
      }
    }
  }

  // Cron mỗi phút: chốt mọi bài làm còn DANG_LAM mà phòng đã quá hạn (dongLuc).
  // Đảm bảo HS đã vào thi luôn có kết quả, kể cả khi mất kết nối và không quay lại.
  @Cron(CronExpression.EVERY_MINUTE)
  async quetBaiLamHetGio() {
    const baiLams = await this.baiLamRepo
      .createQueryBuilder('bl')
      .innerJoin(PhongThi, 'pt', 'pt.maPhongThi = bl.maPhongThi')
      .where('bl.trangThai = :tt', { tt: TrangThaiBaiLam.DANG_LAM })
      .andWhere('pt.dongLuc < :now', { now: new Date() })
      .select('bl.maBaiLam', 'maBaiLam')
      .getRawMany<{ maBaiLam: number }>();

    for (const { maBaiLam } of baiLams) {
      try {
        await this.autoSubmit(maBaiLam);
      } catch (e) {
        this.logger.error(
          `Tự động nộp bài ${maBaiLam} thất bại: ${(e as Error).message}`,
        );
      }
    }
  }

  private async layBaiLamCuaToi(maBaiLam: number, maNguoiDung: number) {
    const baiLam = await this.baiLamRepo.findOne({
      where: { maBaiLam },
      relations: { phongThi: true, baiThi: { monHocHocKy: { monHoc: true } } },
    });
    if (!baiLam) throw new NotFoundException('Không tìm thấy bài làm');
    if (baiLam.maNguoiDung !== maNguoiDung)
      throw new ForbiddenException('Bạn không có quyền truy cập bài làm này');
    return baiLam;
  }

  // Chọn câu hỏi hiển thị theo chế độ phòng thi
  private chonCauHoi(
    dsCauHoi: CauHoiBaiThi[],
    phong: PhongThi,
  ): CauHoiBaiThi[] {
    if (phong.cheDoCauHoi === CheDoCauHoi.THEO_THU_TU) return dsCauHoi;
    // XAO_TRON (và mọi giá trị cũ như 'ngau_nhien' đã bỏ) -> đảo thứ tự toàn bộ.
    return this.xaoTron(dsCauHoi);
  }

  private xaoTron<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Chế độ Theo thứ tự & Xáo trộn đều đảo vị trí đáp án của từng câu.
  private nenXaoTronDapAn(cheDo: CheDoCauHoi): boolean {
    return cheDo === CheDoCauHoi.THEO_THU_TU || cheDo === CheDoCauHoi.XAO_TRON;
  }

  // PRNG xác định (mulberry32) từ một hạt giống nguyên.
  private taoPrng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Fisher–Yates với PRNG xác định: cùng hạt giống -> cùng thứ tự (ổn định khi resume).
  private xaoTronXacDinh<T>(arr: T[], seed: number): T[] {
    const a = [...arr];
    const rnd = this.taoPrng(seed);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Thời gian còn lại tính theo hạn nộp = thời điểm đóng phòng (phong.dongLuc)
  private thoiGianConLai(baiLam: BaiLam): number {
    const conLai = Math.floor(
      (baiLam.phongThi.dongLuc.getTime() - Date.now()) / 1000,
    );
    return conLai > 0 ? conLai : 0;
  }

  // map maCauHoi -> danh sách maLuaChon đã chọn
  private async mapDaTraLoi(
    maBaiLam: number,
    em?: EntityManager,
  ): Promise<Map<number, number[]>> {
    const repo = em ? em.getRepository(NguoiDungTraLoi) : this.traLoiRepo;
    const traLois = await repo.find({ where: { maBaiLam } });
    const map = new Map<number, number[]>();
    for (const tl of traLois) {
      if (tl.maLuaChon == null) continue;
      const arr = map.get(tl.maCauHoi) ?? [];
      arr.push(tl.maLuaChon);
      map.set(tl.maCauHoi, arr);
    }
    return map;
  }

  private dinhDangCauHoi(
    c: CauHoiBaiLam,
    daTraLoi: Map<number, number[]>,
    xaoTronDapAn = false,
  ) {
    let luaChons = c.cauHoi.luaChons ?? [];
    // Đảo vị trí đáp án theo (maBaiLam, maCauHoi): mỗi HS một thứ tự cố định,
    // ổn định qua các lần tải lại. Không ảnh hưởng chấm điểm (chấm theo maLuaChon).
    if (xaoTronDapAn)
      luaChons = this.xaoTronXacDinh(
        luaChons,
        c.maBaiLam * 1_000_003 + c.maCauHoi,
      );
    return {
      thuTuHienThi: c.thuTuHienThi,
      maCauHoi: c.maCauHoi,
      noiDung: c.cauHoi.noiDung,
      hinhAnh: c.cauHoi.hinhAnh,
      loaiCauHoi: c.cauHoi.loaiCauHoi,
      luaChons: luaChons.map((lc) => ({
        maLuaChon: lc.maLuaChon,
        noiDung: lc.noiDung,
      })),
      daChon: daTraLoi.get(c.maCauHoi) ?? [],
    };
  }

  // Tính điểm: 1 câu đúng khi tập lựa chọn đã chọn TRÙNG KHỚP tập đáp án đúng
  private async chamDiem(maBaiLam: number, em?: EntityManager) {
    const chblRepo = em
      ? em.getRepository(CauHoiBaiLam)
      : this.cauHoiBaiLamRepo;
    const luaChonRepo = em
      ? em.getRepository(LuaChon)
      : this.dataSource.getRepository(LuaChon);
    const dapAnRepo = em
      ? em.getRepository(DapAn)
      : this.dataSource.getRepository(DapAn);

    const cauHoiBaiLams = await chblRepo.find({ where: { maBaiLam } });
    const tongSoCau = cauHoiBaiLams.length;
    const maCauHois = cauHoiBaiLams.map((c) => c.maCauHoi);

    // Lựa chọn đúng của từng câu hỏi
    const luaChons = maCauHois.length
      ? await luaChonRepo.findBy({ maCauHoi: In(maCauHois) })
      : [];
    const luaChonIds = luaChons.map((lc) => lc.maLuaChon);
    const dapAns = luaChonIds.length
      ? await dapAnRepo.findBy({ maLuaChon: In(luaChonIds) })
      : [];
    const dapAnDungIds = new Set(dapAns.map((d) => d.maLuaChon));

    const dapAnDungTheoCau = new Map<number, Set<number>>();
    for (const lc of luaChons) {
      if (!dapAnDungIds.has(lc.maLuaChon)) continue;
      const set = dapAnDungTheoCau.get(lc.maCauHoi) ?? new Set<number>();
      set.add(lc.maLuaChon);
      dapAnDungTheoCau.set(lc.maCauHoi, set);
    }

    const daChonTheoCau = await this.mapDaTraLoi(maBaiLam, em);

    let soCauDung = 0;
    for (const maCauHoi of maCauHois) {
      const dung = dapAnDungTheoCau.get(maCauHoi) ?? new Set<number>();
      const chon = new Set(daChonTheoCau.get(maCauHoi) ?? []);
      if (dung.size === 0) continue;
      if (dung.size === chon.size && [...dung].every((id) => chon.has(id)))
        soCauDung++;
    }

    const diemSo =
      tongSoCau > 0 ? Math.round((soCauDung / tongSoCau) * 10 * 100) / 100 : 0;

    return { diemSo, tongSoCau, soCauDung };
  }
}
