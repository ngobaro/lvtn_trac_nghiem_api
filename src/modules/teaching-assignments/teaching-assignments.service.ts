import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhanCongGiangDay } from './entities/phan-cong-giang-day.entity';
import { MonHocHocKy } from '../subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { HocKy } from '../semesters/entities/hoc-ky.entity';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';
import { BaiThi } from '../exams/entities/bai-thi.entity';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { CreateTeachingAssignmentDto } from './dto/create-teaching-assignment.dto';
import { QueryTeachingAssignmentDto } from './dto/query-teaching-assignment.dto';

@Injectable()
export class TeachingAssignmentsService {
  constructor(
    @InjectRepository(PhanCongGiangDay)
    private readonly phanCongRepo: Repository<PhanCongGiangDay>,
    @InjectRepository(MonHocHocKy)
    private readonly mhhkRepo: Repository<MonHocHocKy>,
    @InjectRepository(NguoiDung)
    private readonly nguoiDungRepo: Repository<NguoiDung>,
    @InjectRepository(BaiThi)
    private readonly baiThiRepo: Repository<BaiThi>,
  ) {}

  async findAll(query: QueryTeachingAssignmentDto) {
    const qb = this.phanCongRepo
      .createQueryBuilder('pc')
      .leftJoinAndSelect('pc.giaoVien', 'giaoVien')
      .leftJoinAndSelect('pc.monHocHocKy', 'mhhk')
      .leftJoinAndSelect('mhhk.monHoc', 'monHoc')
      .leftJoinAndSelect('mhhk.hocKy', 'hocKy');

    if (query.maMonHocHocKy !== undefined)
      qb.andWhere('pc.maMonHocHocKy = :id', { id: query.maMonHocHocKy });
    if (query.maGiaoVien !== undefined)
      qb.andWhere('pc.maGiaoVien = :gv', { gv: query.maGiaoVien });

    return qb.orderBy('pc.maPhanCong', 'DESC').getMany();
  }

  // Học kỳ đã kết thúc thì khóa mọi thay đổi phân công.
  private daKetThuc(hocKy: HocKy): boolean {
    const raw = hocKy.ngayKetThuc as unknown as string | Date;
    const kt =
      typeof raw === 'string' ? raw.slice(0, 10) : raw.toISOString().slice(0, 10);
    return new Date().toISOString().slice(0, 10) >= kt;
  }

  private async kiemTraHocKyConMo(maMonHocHocKy: number, hanhDong: string) {
    const mhhk = await this.mhhkRepo.findOne({
      where: { maMonHocHocKy },
      relations: { hocKy: true },
    });
    if (mhhk?.hocKy && this.daKetThuc(mhhk.hocKy))
      throw new BadRequestException(`Học kỳ đã kết thúc, không thể ${hanhDong}`);
  }

  async create(dto: CreateTeachingAssignmentDto) {
    const mhhk = await this.mhhkRepo.findOne({
      where: { maMonHocHocKy: dto.maMonHocHocKy },
      relations: { hocKy: true },
    });
    if (!mhhk)
      throw new BadRequestException('Môn học của học kỳ không tồn tại');
    if (mhhk.hocKy && this.daKetThuc(mhhk.hocKy))
      throw new BadRequestException(
        'Học kỳ đã kết thúc, không thể phân công giáo viên',
      );

    const gv = await this.nguoiDungRepo.findOne({
      where: { maNguoiDung: dto.maGiaoVien },
    });
    if (!gv || gv.vaiTro !== VaiTro.GIAO_VIEN)
      throw new BadRequestException('Người dùng không phải là giáo viên');

    const daCo = await this.phanCongRepo.findOne({
      where: { maMonHocHocKy: dto.maMonHocHocKy, maGiaoVien: dto.maGiaoVien },
    });
    if (daCo)
      throw new BadRequestException(
        'Giáo viên đã được phân dạy môn học này trong học kỳ',
      );

    const pc = this.phanCongRepo.create(dto);
    return this.phanCongRepo.save(pc);
  }

  // Hủy phân công là xóa cứng bản ghi phân công (không phải dữ liệu lịch sử).
  async remove(id: number) {
    const pc = await this.phanCongRepo.findOne({
      where: { maPhanCong: id },
    });
    if (!pc) throw new NotFoundException('Phân công không tồn tại');
    await this.kiemTraHocKyConMo(pc.maMonHocHocKy, 'hủy phân công giáo viên');
    await this.kiemTraPhanCongCoLichSu(pc.maMonHocHocKy, pc.maGiaoVien);
    await this.phanCongRepo.remove(pc);
    return null;
  }

  // chặn hủy phân công nếu giáo viên đã tạo đề thi trong môn-học-kỳ đó
  private async kiemTraPhanCongCoLichSu(
    maMonHocHocKy: number,
    maGiaoVien: number,
  ) {
    const soDe = await this.baiThiRepo.countBy({
      maMonHocHocKy,
      taoBoi: maGiaoVien,
    });
    if (soDe > 0)
      throw new BadRequestException(
        'Không thể hủy phân công: giáo viên đã tạo đề thi trong môn học của học kỳ này',
      );
  }
}
