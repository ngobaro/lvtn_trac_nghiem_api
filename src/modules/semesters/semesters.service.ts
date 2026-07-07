import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { HocKy } from './entities/hoc-ky.entity';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { QuerySemesterDto } from './dto/query-semester.dto';

@Injectable()
export class SemestersService {
  constructor(
    @InjectRepository(HocKy)
    private readonly hocKyRepo: Repository<HocKy>,
  ) {}

  // Ngày hôm nay theo UTC (khớp timezone: 'Z'), dạng 'YYYY-MM-DD'.
  private homNay(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private chuanHoaNgay(ngay: Date | string): string {
    return typeof ngay === 'string'
      ? ngay.slice(0, 10)
      : ngay.toISOString().slice(0, 10);
  }

  // daKetThuc là trường tính động (không lưu DB): đã đến/qua ngày kết thúc.
  private ganTrangThai(hocKy: HocKy) {
    return {
      ...hocKy,
      daKetThuc: this.homNay() >= this.chuanHoaNgay(hocKy.ngayKetThuc),
    };
  }

  // Kiểm tra ràng buộc ngày. batDauDaDoi=true mới chặn ngày bắt đầu trong quá khứ.
  private kiemTraNgay(
    ngayBatDau: string,
    ngayKetThuc: string,
    batDauDaDoi: boolean,
  ) {
    const bd = this.chuanHoaNgay(ngayBatDau);
    const kt = this.chuanHoaNgay(ngayKetThuc);
    if (kt <= bd)
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    if (batDauDaDoi && bd < this.homNay())
      throw new BadRequestException('Ngày bắt đầu không được ở quá khứ');
  }

  private async kiemTraTrung(
    tenHocKy: string,
    namHoc: string,
    boQuaId?: number,
  ) {
    const ton = await this.hocKyRepo.findOne({
      where: {
        tenHocKy,
        namHoc,
        ...(boQuaId ? { maHocKy: Not(boQuaId) } : {}),
      },
    });
    if (ton)
      throw new ConflictException(
        'Học kỳ này đã tồn tại (trùng tên học kỳ và năm học)',
      );
  }

  async findAll(query: QuerySemesterDto) {
    const { page = 1, limit = 10, search } = query;

    const qb = this.hocKyRepo.createQueryBuilder('h');
    if (search)
      qb.andWhere('(h.tenHocKy LIKE :s OR h.namHoc LIKE :s)', {
        s: `%${search}%`,
      });

    const [items, total] = await qb
      .orderBy('h.maHocKy', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      items: items.map((h) => this.ganTrangThai(h)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number) {
    const hocKy = await this.hocKyRepo.findOne({ where: { maHocKy: id } });
    if (!hocKy) throw new NotFoundException('Học kỳ không tồn tại');
    return this.ganTrangThai(hocKy);
  }

  async create(dto: CreateSemesterDto) {
    this.kiemTraNgay(dto.ngayBatDau, dto.ngayKetThuc, true);
    await this.kiemTraTrung(dto.tenHocKy, dto.namHoc);
    const hocKy = this.hocKyRepo.create(dto);
    const daLuu = await this.hocKyRepo.save(hocKy);
    return this.ganTrangThai(daLuu);
  }

  async update(id: number, dto: UpdateSemesterDto) {
    const hocKy = await this.hocKyRepo.findOne({ where: { maHocKy: id } });
    if (!hocKy) throw new NotFoundException('Học kỳ không tồn tại');

    // Học kỳ đã kết thúc thì không cho chỉnh sửa nữa.
    if (this.homNay() >= this.chuanHoaNgay(hocKy.ngayKetThuc))
      throw new BadRequestException('Học kỳ đã kết thúc, không thể chỉnh sửa');

    const ngayCu = this.chuanHoaNgay(hocKy.ngayBatDau);
    const ngayBatDau = dto.ngayBatDau ?? ngayCu;
    const ngayKetThuc = dto.ngayKetThuc ?? this.chuanHoaNgay(hocKy.ngayKetThuc);
    const batDauDaDoi =
      dto.ngayBatDau !== undefined &&
      this.chuanHoaNgay(dto.ngayBatDau) !== ngayCu;
    this.kiemTraNgay(ngayBatDau, ngayKetThuc, batDauDaDoi);

    const tenHocKy = dto.tenHocKy ?? hocKy.tenHocKy;
    const namHoc = dto.namHoc ?? hocKy.namHoc;
    if (tenHocKy !== hocKy.tenHocKy || namHoc !== hocKy.namHoc)
      await this.kiemTraTrung(tenHocKy, namHoc, id);

    const daLuu = await this.hocKyRepo.save({ ...hocKy, ...dto });
    return this.ganTrangThai(daLuu);
  }
}
