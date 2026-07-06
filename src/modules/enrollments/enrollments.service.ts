import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GhiDanh } from './entities/ghi-danh.entity';
import { MonHocHocKy } from '../subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { BulkEnrollmentDto } from './dto/bulk-enrollment.dto';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(GhiDanh)
    private readonly ghiDanhRepo: Repository<GhiDanh>,
    @InjectRepository(MonHocHocKy)
    private readonly mhhkRepo: Repository<MonHocHocKy>,
    @InjectRepository(NguoiDung)
    private readonly nguoiDungRepo: Repository<NguoiDung>,
  ) {}

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

  async create(dto: CreateEnrollmentDto) {
    await this.kiemTraMonHocHocKy(dto.maMonHocHocKy);
    await this.kiemTraHocSinh(dto.maHocSinh);

    const daCo = await this.ghiDanhRepo.findOne({
      where: { maMonHocHocKy: dto.maMonHocHocKy, maHocSinh: dto.maHocSinh },
    });
    if (daCo)
      throw new BadRequestException('Học sinh đã được ghi danh môn học này');

    const gd = this.ghiDanhRepo.create(dto);
    return this.ghiDanhRepo.save(gd);
  }

  // Ghi danh hàng loạt: bỏ qua các học sinh đã ghi danh trước đó.
  async createBulk(dto: BulkEnrollmentDto) {
    await this.kiemTraMonHocHocKy(dto.maMonHocHocKy);

    const hocSinhs = await this.nguoiDungRepo.find({
      where: { maNguoiDung: In(dto.maHocSinhs), vaiTro: VaiTro.HOC_SINH },
    });
    const idHopLe = new Set(hocSinhs.map((h) => h.maNguoiDung));

    const daGhiDanh = await this.ghiDanhRepo.find({
      where: { maMonHocHocKy: dto.maMonHocHocKy },
    });
    const daCo = new Set(daGhiDanh.map((g) => g.maHocSinh));

    const canThem = dto.maHocSinhs
      .filter((id) => idHopLe.has(id) && !daCo.has(id))
      .map((maHocSinh) =>
        this.ghiDanhRepo.create({
          maMonHocHocKy: dto.maMonHocHocKy,
          maHocSinh,
        }),
      );

    if (canThem.length) await this.ghiDanhRepo.save(canThem);
    return { soLuongGhiDanh: canThem.length };
  }

  async remove(id: number) {
    const gd = await this.ghiDanhRepo.findOne({ where: { maGhiDanh: id } });
    if (!gd) throw new NotFoundException('Ghi danh không tồn tại');
    await this.ghiDanhRepo.remove(gd);
    return null;
  }

  private async kiemTraMonHocHocKy(maMonHocHocKy: number) {
    const mhhk = await this.mhhkRepo.findOne({ where: { maMonHocHocKy } });
    if (!mhhk)
      throw new BadRequestException('Môn học của học kỳ không tồn tại');
  }

  private async kiemTraHocSinh(maHocSinh: number) {
    const hs = await this.nguoiDungRepo.findOne({
      where: { maNguoiDung: maHocSinh },
    });
    if (!hs || hs.vaiTro !== VaiTro.HOC_SINH)
      throw new BadRequestException('Người dùng không phải là học sinh');
  }
}
