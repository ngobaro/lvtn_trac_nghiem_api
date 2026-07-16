import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GhiDanh } from './entities/ghi-danh.entity';
import { MonHocHocKy } from '../subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { HocKy } from '../semesters/entities/hoc-ky.entity';
import { BaiLam } from '../exam-sessions/entities/bai-lam.entity';
import { PhongThiHocSinh } from '../exam-rooms/entities/phong-thi-hoc-sinh.entity';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(GhiDanh)
    private readonly ghiDanhRepo: Repository<GhiDanh>,
    @InjectRepository(MonHocHocKy)
    private readonly mhhkRepo: Repository<MonHocHocKy>,
    @InjectRepository(BaiLam)
    private readonly baiLamRepo: Repository<BaiLam>,
    @InjectRepository(PhongThiHocSinh)
    private readonly phongThiHocSinhRepo: Repository<PhongThiHocSinh>,
  ) {}

  // Admin: liệt kê học sinh đã đăng ký theo môn-học-kỳ (dùng cho picker gán phòng
  // và hiển thị ở màn Chi tiết học kỳ). Không còn thao tác ghi danh của Admin.
  async findAll(query: QueryEnrollmentDto) {
    const qb = this.ghiDanhRepo
      .createQueryBuilder('gd')
      .leftJoinAndSelect('gd.hocSinh', 'hocSinh')
      .leftJoinAndSelect('gd.monHocHocKy', 'mhhk')
      .leftJoinAndSelect('mhhk.monHoc', 'monHoc')
      .leftJoinAndSelect('mhhk.hocKy', 'hocKy');

    if (query.maMonHocHocKy !== undefined)
      qb.andWhere('gd.maMonHocHocKy = :id', { id: query.maMonHocHocKy });
    if (query.maHocSinh !== undefined)
      qb.andWhere('gd.maHocSinh = :hs', { hs: query.maHocSinh });

    return qb.orderBy('gd.maGhiDanh', 'DESC').getMany();
  }

  // Học sinh: danh sách môn-học-kỳ đăng ký được (đang hoạt động, học kỳ chưa
  // kết thúc) kèm cờ `daDangKy` cho biết HS đã đăng ký môn đó hay chưa.
  async layMonKhaDung(maHocSinh: number) {
    const offerings = await this.mhhkRepo
      .createQueryBuilder('mhhk')
      .leftJoinAndSelect('mhhk.monHoc', 'monHoc')
      .leftJoinAndSelect('mhhk.hocKy', 'hocKy')
      .where('mhhk.laHoatDong = :hd', { hd: true })
      .orderBy('mhhk.maMonHocHocKy', 'DESC')
      .getMany();

    const conMo = offerings.filter((o) => o.hocKy && !this.daKetThuc(o.hocKy));

    const daDangKys = await this.ghiDanhRepo.find({ where: { maHocSinh } });
    const daCo = new Set(daDangKys.map((g) => g.maMonHocHocKy));

    return conMo.map((o) => ({ ...o, daDangKy: daCo.has(o.maMonHocHocKy) }));
  }

  // Học sinh tự đăng ký 1 môn-học-kỳ.
  async dangKy(maHocSinh: number, maMonHocHocKy: number) {
    const mhhk = await this.kiemTraMonHocHocKy(maMonHocHocKy);
    if (!mhhk.laHoatDong)
      throw new BadRequestException('Môn học này chưa mở đăng ký');

    const daCo = await this.ghiDanhRepo.findOne({
      where: { maMonHocHocKy, maHocSinh },
    });
    if (daCo) throw new BadRequestException('Bạn đã đăng ký môn học này');

    const gd = this.ghiDanhRepo.create({ maMonHocHocKy, maHocSinh });
    return this.ghiDanhRepo.save(gd);
  }

  // Học sinh tự hủy đăng ký. Chặn nếu học kỳ đã kết thúc, đã có bài làm, hoặc
  // đã được Admin gán vào phòng thi của môn-học-kỳ này.
  async huyDangKy(maHocSinh: number, maMonHocHocKy: number) {
    const gd = await this.ghiDanhRepo.findOne({
      where: { maMonHocHocKy, maHocSinh },
    });
    if (!gd) throw new NotFoundException('Bạn chưa đăng ký môn học này');

    await this.kiemTraHocKyConMo(maMonHocHocKy, 'hủy đăng ký');
    await this.kiemTraGhiDanhCoLichSu(maMonHocHocKy, maHocSinh);
    await this.kiemTraDaGanPhong(maMonHocHocKy, maHocSinh);

    await this.ghiDanhRepo.remove(gd);
    return null;
  }

  // Guard: chặn hủy đăng ký nếu học sinh đã có bài làm trong phòng thi thuộc
  // môn-học-kỳ đó (bài làm là dữ liệu lịch sử — không được phá âm thầm).
  private async kiemTraGhiDanhCoLichSu(
    maMonHocHocKy: number,
    maHocSinh: number,
  ) {
    const soBaiLam = await this.baiLamRepo
      .createQueryBuilder('bl')
      .innerJoin('bl.phongThi', 'pt')
      .where('bl.maNguoiDung = :hs', { hs: maHocSinh })
      .andWhere('pt.maMonHocHocKy = :mhhk', { mhhk: maMonHocHocKy })
      .getCount();
    if (soBaiLam > 0)
      throw new BadRequestException(
        'Không thể hủy đăng ký: bạn đã có bài làm trong môn học của học kỳ này',
      );
  }

  // Guard: chặn hủy đăng ký nếu HS đã được gán vào phòng thi (còn hoạt động)
  // của môn-học-kỳ này — Admin đã xếp phòng thì không được rút môn âm thầm.
  private async kiemTraDaGanPhong(maMonHocHocKy: number, maHocSinh: number) {
    const soGan = await this.phongThiHocSinhRepo
      .createQueryBuilder('pths')
      .innerJoin('pths.phongThi', 'pt')
      .where('pths.maHocSinh = :hs', { hs: maHocSinh })
      .andWhere('pt.maMonHocHocKy = :mhhk', { mhhk: maMonHocHocKy })
      .getCount();
    if (soGan > 0)
      throw new BadRequestException(
        'Không thể hủy đăng ký: bạn đã được xếp vào phòng thi của môn học này',
      );
  }

  // Học kỳ đã kết thúc thì khóa mọi thay đổi đăng ký.
  private daKetThuc(hocKy: HocKy): boolean {
    const raw = hocKy.ngayKetThuc as unknown as string | Date;
    const kt =
      typeof raw === 'string'
        ? raw.slice(0, 10)
        : raw.toISOString().slice(0, 10);
    return new Date().toISOString().slice(0, 10) >= kt;
  }

  private async kiemTraMonHocHocKy(maMonHocHocKy: number) {
    const mhhk = await this.mhhkRepo.findOne({
      where: { maMonHocHocKy },
      relations: { hocKy: true },
    });
    if (!mhhk)
      throw new BadRequestException('Môn học của học kỳ không tồn tại');
    if (mhhk.hocKy && this.daKetThuc(mhhk.hocKy))
      throw new BadRequestException(
        'Học kỳ đã kết thúc, không thể đăng ký môn học',
      );
    return mhhk;
  }

  private async kiemTraHocKyConMo(maMonHocHocKy: number, hanhDong: string) {
    const mhhk = await this.mhhkRepo.findOne({
      where: { maMonHocHocKy },
      relations: { hocKy: true },
    });
    if (mhhk?.hocKy && this.daKetThuc(mhhk.hocKy))
      throw new BadRequestException(
        `Học kỳ đã kết thúc, không thể ${hanhDong}`,
      );
  }
}
