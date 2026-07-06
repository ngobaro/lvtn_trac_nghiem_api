import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { MonHoc } from './entities/mon-hoc.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { QuerySubjectDto } from './dto/query-subject.dto';

// Môn học là danh mục chung do Admin quản lý — không còn scoping theo owner.
@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(MonHoc)
    private readonly monHocRepo: Repository<MonHoc>,
  ) {}

  async findAll(query: QuerySubjectDto) {
    const { page = 1, limit = 10, search, laHoatDong } = query;

    const qb = this.monHocRepo.createQueryBuilder('m');
    if (laHoatDong !== undefined)
      qb.andWhere('m.laHoatDong = :laHoatDong', { laHoatDong });
    if (search)
      qb.andWhere('(m.tenMonHoc LIKE :s OR m.maMon LIKE :s)', {
        s: `%${search}%`,
      });

    const [items, total] = await qb
      .orderBy('m.maMonHoc', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const monHoc = await this.monHocRepo.findOne({ where: { maMonHoc: id } });
    if (!monHoc) throw new NotFoundException('Môn học không tồn tại');
    return monHoc;
  }

  async create(dto: CreateSubjectDto) {
    await this.kiemTraTrung(dto.tenMonHoc);
    const monHoc = this.monHocRepo.create(dto);
    return this.monHocRepo.save(monHoc);
  }

  async update(id: number, dto: UpdateSubjectDto) {
    const monHoc = await this.findOne(id);
    await this.kiemTraTrung(dto.tenMonHoc, id);
    return this.monHocRepo.save({ ...monHoc, ...dto });
  }

  // Kiểm tra trùng tên môn trong toàn hệ thống (danh mục chung).
  private async kiemTraTrung(tenMonHoc?: string, boQuaId?: number) {
    if (tenMonHoc) {
      const qb = this.monHocRepo
        .createQueryBuilder('m')
        .where('m.tenMonHoc = :tenMonHoc', { tenMonHoc });
      if (boQuaId) qb.andWhere('m.maMonHoc != :boQuaId', { boQuaId });
      if (await qb.getCount())
        throw new BadRequestException('Tên môn học đã tồn tại');
    }
  }

  // Xóa mềm để không vỡ khóa ngoại với câu hỏi / môn-học-kỳ đang tham chiếu.
  async remove(id: number) {
    const monHoc = await this.findOne(id);
    monHoc.laHoatDong = false;
    await this.monHocRepo.save(monHoc);
    return null;
  }

  async updateStatus(id: number, laHoatDong: boolean) {
    const monHoc = await this.findOne(id);
    monHoc.laHoatDong = laHoatDong;
    return this.monHocRepo.save(monHoc);
  }
}
