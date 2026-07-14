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
import { CauHoi } from '../questions/entities/cau-hoi.entity';
import { MonHocHocKy } from '../subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { PhanCongGiangDay } from '../teaching-assignments/entities/phan-cong-giang-day.entity';

// Môn học là danh mục chung do Admin quản lý — không còn scoping theo owner.
@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(MonHoc)
    private readonly monHocRepo: Repository<MonHoc>,
  ) {}

  // maGiaoVien != undefined => chỉ trả các môn mà giáo viên này được phân dạy
  // trong ít nhất 1 học kỳ (qua PHAN_CONG_GIANG_DAY -> MON_HOC_HOC_KY). Admin
  // (undefined) thấy toàn bộ danh mục.
  async findAll(query: QuerySubjectDto, maGiaoVien?: number) {
    const { page = 1, limit = 10, search, laHoatDong } = query;

    const qb = this.monHocRepo.createQueryBuilder('m');
    if (laHoatDong !== undefined)
      qb.andWhere('m.laHoatDong = :laHoatDong', { laHoatDong });
    if (search)
      qb.andWhere('m.tenMonHoc LIKE :s', {
        s: `%${search}%`,
      });

    if (maGiaoVien !== undefined) {
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('1')
          .from(PhanCongGiangDay, 'pc')
          .innerJoin(
            MonHocHocKy,
            'mhhk',
            'mhhk.maMonHocHocKy = pc.maMonHocHocKy',
          )
          .where('mhhk.maMonHoc = m.maMonHoc')
          .andWhere('pc.maGiaoVien = :maGiaoVien')
          .getQuery();
        return `EXISTS ${sub}`;
      }).setParameter('maGiaoVien', maGiaoVien);
    }

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

  // Xóa: nếu môn học CHƯA có dữ liệu liên quan -> xóa cứng hoàn toàn khỏi DB;
  // nếu còn tham chiếu (câu hỏi / môn-học-kỳ) -> xóa mềm (laHoatDong=false)
  // để không vỡ khóa ngoại và giữ lịch sử.
  async remove(id: number) {
    const monHoc = await this.findOne(id);
    const em = this.monHocRepo.manager;

    // Các bảng tham chiếu trực tiếp tới MON_HOC.maMonHoc cần kiểm tra.
    const bangThamChieu: [Function, string][] = [
      [CauHoi, 'maMonHoc'],
      [MonHocHocKy, 'maMonHoc'],
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
      // Còn dữ liệu tham chiếu -> xóa mềm.
      monHoc.laHoatDong = false;
      await this.monHocRepo.save(monHoc);
      return { daXoaCung: false };
    }

    // Chưa có dữ liệu liên quan -> xóa cứng hoàn toàn khỏi DB.
    await this.monHocRepo.delete(id);
    return { daXoaCung: true };
  }

  async updateStatus(id: number, laHoatDong: boolean) {
    const monHoc = await this.findOne(id);
    monHoc.laHoatDong = laHoatDong;
    return this.monHocRepo.save(monHoc);
  }
}
