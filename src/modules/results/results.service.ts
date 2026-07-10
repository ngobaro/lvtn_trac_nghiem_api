import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { KetQua } from './entities/ket-qua.entity';
import { BaiThi } from '../exams/entities/bai-thi.entity';
import { BaiLam } from '../exam-sessions/entities/bai-lam.entity';
import { PhongThi } from '../exam-rooms/entities/phong-thi.entity';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';
import { ThanhVienPhong } from '../exam-rooms/entities/thanh-vien-phong.entity';
import { PhongThiHocSinh } from '../exam-rooms/entities/phong-thi-hoc-sinh.entity';
import { MonHoc } from '../subjects/entities/mon-hoc.entity';
import { MonHocHocKy } from '../subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { HocKy } from '../semesters/entities/hoc-ky.entity';
import { PhanCongGiangDay } from '../teaching-assignments/entities/phan-cong-giang-day.entity';
import { QueryMyResultDto } from './dto/query-my-result.dto';
import { QueryResultRoomDto } from './dto/query-result-room.dto';
import { CauHoiBaiLam } from '../exam-sessions/entities/cau-hoi-bai-lam.entity';
import { NguoiDungTraLoi } from '../exam-sessions/entities/nguoi-dung-tra-loi.entity';
import { LuaChon } from '../questions/entities/lua-chon.entity';
import { DapAn } from '../questions/entities/dap-an.entity';
import { QueryResultDto } from './dto/query-result.dto';
import { QueryResultStatsDto } from './dto/query-result-stats.dto';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { TrangThaiPhongThi } from '../../common/enums/trang-thai-phong-thi.enum';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(KetQua) private ketQuaRepo: Repository<KetQua>,
    @InjectRepository(PhanCongGiangDay)
    private phanCongRepo: Repository<PhanCongGiangDay>,
    private dataSource: DataSource,
  ) {}

  // Các môn-học-kỳ mà 1 giáo viên được phân dạy (để giới hạn phạm vi xem kết quả).
  private async layOfferingsGvDay(maGiaoVien: number): Promise<number[]> {
    const ds = await this.phanCongRepo.find({
      where: { maGiaoVien },
      select: { maMonHocHocKy: true },
    });
    return ds.map((p) => p.maMonHocHocKy);
  }

  // Cột chung cho một dòng lịch sử thi (phòng được gán + kết quả nếu có).
  private readonly COT_LICH_SU = [
    'pt.maPhongThi AS maPhongThi',
    'pt.tenPhongThi AS tenPhongThi',
    'pt.dongLuc AS dongLuc',
    'mhhk.maMonHoc AS maMonHoc',
    'mh.tenMonHoc AS tenMonHoc',
    'kq.maKetQua AS maKetQua',
    'kq.maBaiLam AS maBaiLam',
    'kq.maBaiThi AS maBaiThi',
    'kq.diemSo AS diemSo',
    'kq.tongSoCau AS tongSoCau',
    'kq.soCauDung AS soCauDung',
    'bt.tieuDe AS tieuDe',
    'bl.thoiGianBatDau AS thoiGianBatDau',
    'bl.thoiGianKetThuc AS thoiGianNop',
    'bl.trangThai AS trangThaiBaiLam',
    'CASE WHEN kq.maKetQua IS NULL THEN 0 ELSE 1 END AS daThi',
  ];

  // Dựng truy vấn lịch sử thi của 1 học sinh: liệt kê các phòng em được gán, chỉ
  // giữ dòng khi em ĐÃ CÓ KẾT QUẢ (đã nộp — thấy ngay, kể cả phòng đang mở) HOẶC
  // phòng ĐÃ ĐÓNG (khi đó phòng em không thi hiện "Không tham gia"). Trả về
  // QueryBuilder CHƯA select để nơi gọi tự áp select/phân trang/sắp xếp.
  private qbLichSuHocSinh(
    maHocSinh: number,
    loc: { search?: string; maMonHoc?: number } = {},
  ) {
    const qb = this.dataSource
      .getRepository(PhongThiHocSinh)
      .createQueryBuilder('pths')
      .innerJoin(PhongThi, 'pt', 'pt.maPhongThi = pths.maPhongThi')
      .innerJoin(MonHocHocKy, 'mhhk', 'mhhk.maMonHocHocKy = pt.maMonHocHocKy')
      .leftJoin(MonHoc, 'mh', 'mh.maMonHoc = mhhk.maMonHoc')
      .leftJoin(
        BaiLam,
        'bl',
        'bl.maPhongThi = pt.maPhongThi AND bl.maNguoiDung = :maHocSinh',
        { maHocSinh },
      )
      .leftJoin(KetQua, 'kq', 'kq.maBaiLam = bl.maBaiLam')
      .leftJoin(BaiThi, 'bt', 'bt.maBaiThi = kq.maBaiThi')
      .where('pths.maHocSinh = :maHocSinh', { maHocSinh })
      .andWhere(
        '(kq.maKetQua IS NOT NULL OR pt.dongLuc < :now OR pt.trangThai = :daDong)',
        { now: new Date(), daDong: TrangThaiPhongThi.DA_DONG },
      );

    if (loc.search)
      qb.andWhere('(pt.tenPhongThi LIKE :s OR bt.tieuDe LIKE :s)', {
        s: `%${loc.search}%`,
      });
    if (loc.maMonHoc)
      qb.andWhere('mhhk.maMonHoc = :maMonHoc', { maMonHoc: loc.maMonHoc });

    return qb;
  }

  // Lịch sử thi của học sinh hiện tại (có phân trang + lọc tên đề/môn).
  async getMyResults(maNguoiDung: number, query: QueryMyResultDto = {}) {
    const { page = 1, limit = 10, search, maMonHoc } = query;

    const qb = this.qbLichSuHocSinh(maNguoiDung, { search, maMonHoc });
    const countQb = qb.clone();

    qb.select(this.COT_LICH_SU)
      .orderBy('pt.dongLuc', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const raw = await qb.getRawMany();
    const items = raw.map((r) => ({ ...r, daThi: Number(r.daThi) === 1 }));
    const total = await countQb.getCount();
    return { items, total, page, limit };
  }

  // Admin: bảng điểm tất cả môn của 1 học sinh — toàn bộ dòng (không phân trang),
  // sắp theo môn rồi giờ đóng phòng. FE tự gom nhóm theo môn + tính điểm TB.
  async getKetQuaTheoHocSinh(maHocSinh: number) {
    const raw = await this.qbLichSuHocSinh(maHocSinh)
      .select(this.COT_LICH_SU)
      .orderBy('mh.tenMonHoc', 'ASC')
      .addOrderBy('pt.dongLuc', 'DESC')
      .getRawMany();
    return raw.map((r) => ({ ...r, daThi: Number(r.daThi) === 1 }));
  }

  // Danh sách môn học của các phòng học sinh được gán mà dòng thực sự hiển thị
  // (đã có kết quả HOẶC phòng đã đóng) — khớp bộ lọc với getMyResults.
  async getMySubjects(maNguoiDung: number) {
    return this.dataSource
      .getRepository(PhongThiHocSinh)
      .createQueryBuilder('pths')
      .innerJoin(PhongThi, 'pt', 'pt.maPhongThi = pths.maPhongThi')
      .innerJoin(MonHocHocKy, 'mhhk', 'mhhk.maMonHocHocKy = pt.maMonHocHocKy')
      .leftJoin(MonHoc, 'mh', 'mh.maMonHoc = mhhk.maMonHoc')
      .leftJoin(
        BaiLam,
        'bl',
        'bl.maPhongThi = pt.maPhongThi AND bl.maNguoiDung = :maNguoiDung',
        { maNguoiDung },
      )
      .leftJoin(KetQua, 'kq', 'kq.maBaiLam = bl.maBaiLam')
      .where('pths.maHocSinh = :maNguoiDung', { maNguoiDung })
      .andWhere(
        '(kq.maKetQua IS NOT NULL OR pt.dongLuc < :now OR pt.trangThai = :daDong)',
        { now: new Date(), daDong: TrangThaiPhongThi.DA_DONG },
      )
      .select('mhhk.maMonHoc', 'maMonHoc')
      .addSelect('mh.tenMonHoc', 'tenMonHoc')
      .distinct(true)
      .orderBy('mh.tenMonHoc', 'ASC')
      .getRawMany();
  }

  // Danh sách kết quả (GV chỉ xem đề của môn-kỳ mình dạy, Admin xem tất cả)
  async getResults(query: QueryResultDto, user: CurrentUserPayload) {
    const { page = 1, limit = 10, maBaiThi, maPhongThi, maNguoiDung } = query;

    const qb = this.ketQuaRepo
      .createQueryBuilder('kq')
      .leftJoin(BaiThi, 'bt', 'bt.maBaiThi = kq.maBaiThi')
      .leftJoin(BaiLam, 'bl', 'bl.maBaiLam = kq.maBaiLam')
      .leftJoin(NguoiDung, 'nd', 'nd.maNguoiDung = kq.maNguoiDung');

    if (user.vaiTro !== VaiTro.QUAN_TRI_VIEN)
      await this.gioiHanTheoGvDay(qb, user.maNguoiDung);
    if (maBaiThi) qb.andWhere('kq.maBaiThi = :maBaiThi', { maBaiThi });
    if (maPhongThi) qb.andWhere('bl.maPhongThi = :maPhongThi', { maPhongThi });
    if (maNguoiDung)
      qb.andWhere('kq.maNguoiDung = :maNguoiDung', { maNguoiDung });

    const countQb = qb.clone();

    qb.select([
      'kq.maKetQua AS maKetQua',
      'kq.maBaiLam AS maBaiLam',
      'kq.maBaiThi AS maBaiThi',
      'kq.maNguoiDung AS maNguoiDung',
      'nd.tenNguoiDung AS tenNguoiDung',
      'nd.email AS email',
      'kq.diemSo AS diemSo',
      'kq.tongSoCau AS tongSoCau',
      'kq.soCauDung AS soCauDung',
      'bt.tieuDe AS tieuDe',
      'bl.maPhongThi AS maPhongThi',
      'bl.thoiGianKetThuc AS thoiGianNop',
    ])
      .orderBy('kq.maKetQua', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const items = await qb.getRawMany();
    const total = await countQb.getCount();
    return { items, total, page, limit };
  }

  // Thêm điều kiện giới hạn theo môn-học-kỳ mà GV được phân dạy (trên alias 'bt').
  private async gioiHanTheoGvDay(qb: any, maGiaoVien: number) {
    const offerings = await this.layOfferingsGvDay(maGiaoVien);
    if (offerings.length === 0) {
      qb.andWhere('1 = 0');
      return;
    }
    qb.andWhere('bt.maMonHocHocKy IN (:...offerings)', { offerings });
  }

  // Chi tiết 1 kết quả: từng câu hỏi kèm đáp án đã chọn vs đáp án đúng
  async getResultDetail(maKetQua: number, user: CurrentUserPayload) {
    const ketQua = await this.ketQuaRepo.findOne({ where: { maKetQua } });
    if (!ketQua) throw new NotFoundException('Không tìm thấy kết quả');

    await this.kiemTraQuyenXem(ketQua, user);

    const cauHoiBaiLams = await this.dataSource
      .getRepository(CauHoiBaiLam)
      .find({
        where: { maBaiLam: ketQua.maBaiLam },
        relations: { cauHoi: { luaChons: true } },
        order: { thuTuHienThi: 'ASC' },
      });

    const daChonTheoCau = await this.mapDaChon(ketQua.maBaiLam);
    const dapAnDung = await this.mapDapAnDung(
      cauHoiBaiLams.flatMap((c) => c.cauHoi.luaChons ?? []),
    );

    const cauHois = cauHoiBaiLams.map((c) => {
      const daChon = daChonTheoCau.get(c.maCauHoi) ?? new Set<number>();
      const luaChons = (c.cauHoi.luaChons ?? []).map((lc) => ({
        maLuaChon: lc.maLuaChon,
        noiDung: lc.noiDung,
        laDapAnDung: dapAnDung.has(lc.maLuaChon),
        daChon: daChon.has(lc.maLuaChon),
      }));
      const dung =
        luaChons.length > 0 &&
        luaChons.every((lc) => lc.laDapAnDung === lc.daChon) &&
        luaChons.some((lc) => lc.laDapAnDung);
      return {
        thuTuHienThi: c.thuTuHienThi,
        maCauHoi: c.maCauHoi,
        noiDung: c.cauHoi.noiDung,
        hinhAnh: c.cauHoi.hinhAnh,
        loaiCauHoi: c.cauHoi.loaiCauHoi,
        dung,
        luaChons,
      };
    });

    return {
      maKetQua: ketQua.maKetQua,
      maBaiLam: ketQua.maBaiLam,
      maBaiThi: ketQua.maBaiThi,
      diemSo: ketQua.diemSo,
      tongSoCau: ketQua.tongSoCau,
      soCauDung: ketQua.soCauDung,
      cauHois,
    };
  }

  // Thống kê điểm theo đề thi / phòng thi / môn học
  async getStats(query: QueryResultStatsDto, user: CurrentUserPayload) {
    const { maBaiThi, maPhongThi, maMonHoc } = query;

    const qb = this.ketQuaRepo
      .createQueryBuilder('kq')
      .leftJoin(BaiThi, 'bt', 'bt.maBaiThi = kq.maBaiThi')
      .leftJoin(BaiLam, 'bl', 'bl.maBaiLam = kq.maBaiLam')
      .leftJoin(MonHocHocKy, 'mhhk', 'mhhk.maMonHocHocKy = bt.maMonHocHocKy');

    if (user.vaiTro !== VaiTro.QUAN_TRI_VIEN)
      await this.gioiHanTheoGvDay(qb, user.maNguoiDung);
    if (maBaiThi) qb.andWhere('kq.maBaiThi = :maBaiThi', { maBaiThi });
    if (maPhongThi) qb.andWhere('bl.maPhongThi = :maPhongThi', { maPhongThi });
    if (maMonHoc) qb.andWhere('mhhk.maMonHoc = :maMonHoc', { maMonHoc });

    const raw = await qb
      .select('COUNT(kq.maKetQua)', 'soLuotThi')
      .addSelect('AVG(kq.diemSo)', 'diemTrungBinh')
      .addSelect('MAX(kq.diemSo)', 'diemCaoNhat')
      .addSelect('MIN(kq.diemSo)', 'diemThapNhat')
      .getRawOne();

    const soLuotThi = Number(raw.soLuotThi) || 0;
    return {
      soLuotThi,
      diemTrungBinh: soLuotThi
        ? Math.round(Number(raw.diemTrungBinh) * 100) / 100
        : 0,
      diemCaoNhat: soLuotThi ? Number(raw.diemCaoNhat) : 0,
      diemThapNhat: soLuotThi ? Number(raw.diemThapNhat) : 0,
    };
  }

  // Thống kê gom nhóm theo phòng thi (GV chỉ xem phòng của môn-kỳ mình dạy).
  async getRoomStats(query: QueryResultRoomDto, user: CurrentUserPayload) {
    const { page = 1, limit = 10, maMonHoc, search } = query;

    const phongThiRepo = this.dataSource.getRepository(PhongThi);

    const baseQb = phongThiRepo
      .createQueryBuilder('pt')
      .leftJoin(MonHocHocKy, 'mhhk', 'mhhk.maMonHocHocKy = pt.maMonHocHocKy')
      .where('pt.laHoatDong = :hd', { hd: true });

    if (user.vaiTro !== VaiTro.QUAN_TRI_VIEN) {
      const offerings = await this.layOfferingsGvDay(user.maNguoiDung);
      if (offerings.length === 0) return { items: [], total: 0, page, limit };
      baseQb.andWhere('pt.maMonHocHocKy IN (:...offerings)', { offerings });
    }
    if (maMonHoc) baseQb.andWhere('mhhk.maMonHoc = :maMonHoc', { maMonHoc });
    if (search) baseQb.andWhere('pt.tenPhongThi LIKE :s', { s: `%${search}%` });

    const total = await baseQb.clone().getCount();

    const qb = baseQb
      .leftJoin(MonHoc, 'mh', 'mh.maMonHoc = mhhk.maMonHoc')
      .leftJoin(HocKy, 'hk', 'hk.maHocKy = mhhk.maHocKy')
      .leftJoin(BaiLam, 'bl', 'bl.maPhongThi = pt.maPhongThi')
      .leftJoin(KetQua, 'kq', 'kq.maBaiLam = bl.maBaiLam')
      .select('pt.maPhongThi', 'maPhongThi')
      .addSelect('pt.tenPhongThi', 'tenPhongThi')
      .addSelect('mh.tenMonHoc', 'tenMonHoc')
      .addSelect('hk.tenHocKy', 'tenHocKy')
      .addSelect('hk.namHoc', 'namHoc')
      .addSelect('COUNT(DISTINCT kq.maKetQua)', 'soLuotNop')
      .addSelect('AVG(kq.diemSo)', 'diemTrungBinh')
      .addSelect('MAX(kq.diemSo)', 'diemCaoNhat')
      .addSelect('MIN(kq.diemSo)', 'diemThapNhat')
      // Mẫu số: số học sinh đã vào phòng — subquery tương quan để không nhân dòng.
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)')
            .from(ThanhVienPhong, 'tv')
            .where('tv.maPhongThi = pt.maPhongThi'),
        'tongThanhVien',
      )
      .groupBy('pt.maPhongThi')
      .addGroupBy('pt.tenPhongThi')
      .addGroupBy('mh.tenMonHoc')
      .addGroupBy('hk.tenHocKy')
      .addGroupBy('hk.namHoc')
      .orderBy('pt.maPhongThi', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const raw = await qb.getRawMany();
    const items = raw.map((r) => {
      const soLuotNop = Number(r.soLuotNop) || 0;
      return {
        maPhongThi: Number(r.maPhongThi),
        tenPhongThi: r.tenPhongThi,
        tenMonHoc: r.tenMonHoc,
        tenHocKy: r.tenHocKy,
        namHoc: r.namHoc,
        soLuotNop,
        tongThanhVien: Number(r.tongThanhVien) || 0,
        diemTrungBinh: soLuotNop
          ? Math.round(Number(r.diemTrungBinh) * 100) / 100
          : 0,
        diemCaoNhat: soLuotNop ? Number(r.diemCaoNhat) : 0,
        diemThapNhat: soLuotNop ? Number(r.diemThapNhat) : 0,
      };
    });

    return { items, total, page, limit };
  }

  // Bảng điểm 1 phòng: liệt kê TẤT CẢ học sinh được gán vào phòng
  // (PHONG_THI_HOC_SINH), trái-nối với KET_QUA để lấy điểm. Em nào chưa thi
  // (chưa có kết quả) vẫn hiện với daThi=false, các trường điểm null.
  async getRoomScores(
    maPhongThi: number,
    user: CurrentUserPayload,
    query: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 10 } = query;

    const phong = await this.dataSource
      .getRepository(PhongThi)
      .findOne({ where: { maPhongThi } });
    if (!phong) throw new NotFoundException('Không tìm thấy phòng thi');

    // Phạm vi GV: chỉ xem phòng thuộc môn-học-kỳ mình được phân dạy.
    if (user.vaiTro !== VaiTro.QUAN_TRI_VIEN) {
      const offerings = await this.layOfferingsGvDay(user.maNguoiDung);
      if (!offerings.includes(phong.maMonHocHocKy))
        throw new ForbiddenException('Bạn không có quyền xem phòng thi này');
    }

    const dsGan = await this.dataSource.getRepository(PhongThiHocSinh).find({
      where: { maPhongThi },
      relations: { hocSinh: true },
    });

    const ketQuas = await this.ketQuaRepo
      .createQueryBuilder('kq')
      .innerJoin(BaiLam, 'bl', 'bl.maBaiLam = kq.maBaiLam')
      .leftJoin(BaiThi, 'bt', 'bt.maBaiThi = kq.maBaiThi')
      .where('bl.maPhongThi = :maPhongThi', { maPhongThi })
      .select([
        'kq.maKetQua AS maKetQua',
        'kq.maNguoiDung AS maNguoiDung',
        'kq.diemSo AS diemSo',
        'kq.soCauDung AS soCauDung',
        'kq.tongSoCau AS tongSoCau',
        'bt.tieuDe AS tieuDe',
        'bl.thoiGianKetThuc AS thoiGianNop',
      ])
      .getRawMany();
    const mapKq = new Map(ketQuas.map((k) => [Number(k.maNguoiDung), k]));

    const tatCa = dsGan
      .map((g) => {
        const kq = mapKq.get(g.maHocSinh);
        return {
          maNguoiDung: g.maHocSinh,
          tenNguoiDung: g.hocSinh?.tenNguoiDung ?? null,
          email: g.hocSinh?.email ?? null,
          daThi: !!kq,
          maKetQua: kq ? Number(kq.maKetQua) : null,
          tieuDe: kq ? kq.tieuDe : null,
          diemSo: kq ? Number(kq.diemSo) : null,
          soCauDung: kq ? Number(kq.soCauDung) : null,
          tongSoCau: kq ? Number(kq.tongSoCau) : null,
          thoiGianNop: kq ? kq.thoiGianNop : null,
        };
      })
      .sort((a, b) =>
        (a.tenNguoiDung ?? '').localeCompare(b.tenNguoiDung ?? ''),
      );

    const total = tatCa.length;
    const items = tatCa.slice((page - 1) * limit, (page - 1) * limit + limit);
    return { items, total, page, limit };
  }

  // ----- Helpers -----

  private async kiemTraQuyenXem(ketQua: KetQua, user: CurrentUserPayload) {
    if (user.vaiTro === VaiTro.QUAN_TRI_VIEN) return;
    if (user.vaiTro === VaiTro.HOC_SINH) {
      if (ketQua.maNguoiDung !== user.maNguoiDung)
        throw new ForbiddenException('Bạn không có quyền xem kết quả này');
      // Chưa tới giờ đóng phòng -> chưa cho HS xem chi tiết để tránh lộ đáp án.
      const baiLam = await this.dataSource.getRepository(BaiLam).findOne({
        where: { maBaiLam: ketQua.maBaiLam },
        relations: { phongThi: true },
      });
      if (baiLam?.phongThi && new Date() < baiLam.phongThi.dongLuc)
        throw new ForbiddenException(
          'Chi tiết bài làm chỉ xem được sau khi phòng thi đóng',
        );
      return;
    }
    // Giáo viên: chỉ xem kết quả của đề thuộc môn-kỳ mình được phân dạy.
    const baiThi = await this.dataSource
      .getRepository(BaiThi)
      .findOne({ where: { maBaiThi: ketQua.maBaiThi } });
    const offerings = await this.layOfferingsGvDay(user.maNguoiDung);
    if (!baiThi || !offerings.includes(baiThi.maMonHocHocKy))
      throw new ForbiddenException('Bạn không có quyền xem kết quả này');
  }

  // map maCauHoi -> Set(maLuaChon đã chọn)
  private async mapDaChon(maBaiLam: number): Promise<Map<number, Set<number>>> {
    const traLois = await this.dataSource
      .getRepository(NguoiDungTraLoi)
      .find({ where: { maBaiLam } });
    const map = new Map<number, Set<number>>();
    for (const tl of traLois) {
      if (tl.maLuaChon == null) continue;
      const set = map.get(tl.maCauHoi) ?? new Set<number>();
      set.add(tl.maLuaChon);
      map.set(tl.maCauHoi, set);
    }
    return map;
  }

  // tập maLuaChon là đáp án đúng
  private async mapDapAnDung(luaChons: LuaChon[]): Promise<Set<number>> {
    const ids = luaChons.map((lc) => lc.maLuaChon);
    if (ids.length === 0) return new Set();
    const dapAns = await this.dataSource
      .getRepository(DapAn)
      .findBy({ maLuaChon: In(ids) });
    return new Set(dapAns.map((d) => d.maLuaChon));
  }
}
