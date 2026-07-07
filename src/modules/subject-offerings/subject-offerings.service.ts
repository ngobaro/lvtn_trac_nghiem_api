import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonHocHocKy } from './entities/mon-hoc-hoc-ky.entity';
import { PhanCongGiangDay } from '../teaching-assignments/entities/phan-cong-giang-day.entity';
import { GhiDanh } from '../enrollments/entities/ghi-danh.entity';
import { MonHoc } from '../subjects/entities/mon-hoc.entity';
import { HocKy } from '../semesters/entities/hoc-ky.entity';
import { CreateSubjectOfferingDto } from './dto/create-subject-offering.dto';
import { UpdateSubjectOfferingDto } from './dto/update-subject-offering.dto';
import { QuerySubjectOfferingDto } from './dto/query-subject-offering.dto';

@Injectable()
export class SubjectOfferingsService {
  constructor(
    @InjectRepository(MonHocHocKy)
    private readonly mhhkRepo: Repository<MonHocHocKy>,
    @InjectRepository(MonHoc)
    private readonly monHocRepo: Repository<MonHoc>,
    @InjectRepository(HocKy)
    private readonly hocKyRepo: Repository<HocKy>,
  ) {}

  async findAll(query: QuerySubjectOfferingDto) {
    const {
      page = 1,
      limit = 10,
      search,
      laHoatDong,
      maHocKy,
      maMonHoc,
    } = query;

    const qb = this.mhhkRepo
      .createQueryBuilder('mhhk')
      .leftJoinAndSelect('mhhk.monHoc', 'monHoc')
      .leftJoinAndSelect('mhhk.hocKy', 'hocKy');

    if (maHocKy !== undefined)
      qb.andWhere('mhhk.maHocKy = :maHocKy', { maHocKy });
    if (maMonHoc !== undefined)
      qb.andWhere('mhhk.maMonHoc = :maMonHoc', { maMonHoc });
    if (laHoatDong !== undefined)
      qb.andWhere('mhhk.laHoatDong = :laHoatDong', { laHoatDong });
    if (search) qb.andWhere('monHoc.tenMonHoc LIKE :s', { s: `%${search}%` });

    const [items, total] = await qb
      .orderBy('mhhk.maMonHocHocKy', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const mhhk = await this.mhhkRepo.findOne({
      where: { maMonHocHocKy: id },
      relations: { monHoc: true, hocKy: true },
    });
    if (!mhhk) throw new NotFoundException('Môn học của học kỳ không tồn tại');
    return mhhk;
  }

  // Học kỳ đã kết thúc (today >= ngayKetThuc) thì khóa mọi thay đổi môn học.
  private daKetThuc(hocKy: HocKy): boolean {
    // TypeORM trả cột `date` dưới dạng chuỗi 'YYYY-MM-DD' lúc chạy.
    const raw = hocKy.ngayKetThuc as unknown as string | Date;
    const kt =
      typeof raw === 'string' ? raw.slice(0, 10) : raw.toISOString().slice(0, 10);
    return new Date().toISOString().slice(0, 10) >= kt;
  }

  async create(dto: CreateSubjectOfferingDto) {
    const monHoc = await this.monHocRepo.findOne({
      where: { maMonHoc: dto.maMonHoc },
    });
    if (!monHoc) throw new BadRequestException('Môn học không tồn tại');
    const hocKy = await this.hocKyRepo.findOne({
      where: { maHocKy: dto.maHocKy },
    });
    if (!hocKy) throw new BadRequestException('Học kỳ không tồn tại');
    if (this.daKetThuc(hocKy))
      throw new BadRequestException(
        'Học kỳ đã kết thúc, không thể mở thêm môn học',
      );

    const daCo = await this.mhhkRepo.findOne({
      where: { maMonHoc: dto.maMonHoc, maHocKy: dto.maHocKy },
    });
    if (daCo) {
      // Đang mở → trùng. Đã gỡ (xóa mềm) → mở lại chính bản ghi cũ.
      if (daCo.laHoatDong)
        throw new BadRequestException('Môn học đã được mở trong học kỳ này');
      daCo.laHoatDong = true;
      return this.mhhkRepo.save(daCo);
    }

    const mhhk = this.mhhkRepo.create(dto);
    return this.mhhkRepo.save(mhhk);
  }

  async update(id: number, dto: UpdateSubjectOfferingDto) {
    const mhhk = await this.findOne(id);
    return this.mhhkRepo.save({ ...mhhk, ...dto });
  }

  // Xóa mềm.
  async remove(id: number) {
    const mhhk = await this.findOne(id);
    if (this.daKetThuc(mhhk.hocKy))
      throw new BadRequestException(
        'Học kỳ đã kết thúc, không thể gỡ môn học',
      );
    mhhk.laHoatDong = false;
    await this.mhhkRepo.save(mhhk);
    return null;
  }

  async updateStatus(id: number, laHoatDong: boolean) {
    const mhhk = await this.findOne(id);
    mhhk.laHoatDong = laHoatDong;
    return this.mhhkRepo.save(mhhk);
  }

  // Danh sách môn-học-kỳ mà 1 giáo viên được phân dạy (kèm quan hệ hiển thị).
  async layDangDay(maGiaoVien: number) {
    return this.mhhkRepo
      .createQueryBuilder('mhhk')
      .innerJoin(
        PhanCongGiangDay,
        'pc',
        'pc.maMonHocHocKy = mhhk.maMonHocHocKy AND pc.maGiaoVien = :maGiaoVien',
        { maGiaoVien },
      )
      .leftJoinAndSelect('mhhk.monHoc', 'monHoc')
      .leftJoinAndSelect('mhhk.hocKy', 'hocKy')
      .orderBy('mhhk.maMonHocHocKy', 'DESC')
      .getMany();
  }

  // Danh sách môn-học-kỳ mà 1 học sinh đã được ghi danh.
  async layDaGhiDanh(maHocSinh: number) {
    return this.mhhkRepo
      .createQueryBuilder('mhhk')
      .innerJoin(
        GhiDanh,
        'gd',
        'gd.maMonHocHocKy = mhhk.maMonHocHocKy AND gd.maHocSinh = :maHocSinh',
        { maHocSinh },
      )
      .leftJoinAndSelect('mhhk.monHoc', 'monHoc')
      .leftJoinAndSelect('mhhk.hocKy', 'hocKy')
      .orderBy('mhhk.maMonHocHocKy', 'DESC')
      .getMany();
  }
}
