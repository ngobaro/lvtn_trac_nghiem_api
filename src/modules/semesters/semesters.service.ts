import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findAll(query: QuerySemesterDto) {
    const { page = 1, limit = 10, search, laHoatDong } = query;

    const qb = this.hocKyRepo.createQueryBuilder('h');
    if (laHoatDong !== undefined)
      qb.andWhere('h.laHoatDong = :laHoatDong', { laHoatDong });
    if (search)
      qb.andWhere('(h.tenHocKy LIKE :s OR h.namHoc LIKE :s)', {
        s: `%${search}%`,
      });

    const [items, total] = await qb
      .orderBy('h.maHocKy', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const hocKy = await this.hocKyRepo.findOne({ where: { maHocKy: id } });
    if (!hocKy) throw new NotFoundException('Học kỳ không tồn tại');
    return hocKy;
  }

  async create(dto: CreateSemesterDto) {
    const hocKy = this.hocKyRepo.create(dto);
    return this.hocKyRepo.save(hocKy);
  }

  async update(id: number, dto: UpdateSemesterDto) {
    const hocKy = await this.findOne(id);
    return this.hocKyRepo.save({ ...hocKy, ...dto });
  }

  // Xóa mềm: chỉ tắt trạng thái hoạt động, giữ dữ liệu tham chiếu.
  async remove(id: number) {
    const hocKy = await this.findOne(id);
    hocKy.laHoatDong = false;
    await this.hocKyRepo.save(hocKy);
    return null;
  }

  async updateStatus(id: number, laHoatDong: boolean) {
    const hocKy = await this.findOne(id);
    hocKy.laHoatDong = laHoatDong;
    return this.hocKyRepo.save(hocKy);
  }
}
