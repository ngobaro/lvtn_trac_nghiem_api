import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { BaiThi } from './entities/bai-thi.entity';
import { CauHoiBaiThi } from './entities/cau-hoi-bai-thi.entity';
import { CauHoi } from '../questions/entities/cau-hoi.entity';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamQuestionOrderDto } from './dto/exam-question-order.dto';
import { TrangThaiBaiThi } from '../../common/enums/trang-thai-bai-thi.enum';
import { PhongThi } from '../exam-rooms/entities/phong-thi.entity';
import { TrangThaiPhongThi } from '../../common/enums/trang-thai-phong-thi.enum';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(BaiThi) private baiThiRepo: Repository<BaiThi>,
    @InjectRepository(PhongThi) private phongThiRepo: Repository<PhongThi>,
    private dataSource: DataSource,
  ) {}

  // taoBoi = undefined => admin, không filter theo người tạo
  async findAll(page = 1, limit = 20, taoBoi?: number) {
    const where = taoBoi !== undefined ? { taoBoi } : {};

    const [items, total] = await this.baiThiRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  // taoBoi = undefined => admin bypass ownership check
  async findOne(id: number, taoBoi?: number) {
    const where: any = { maBaiThi: id };
    if (taoBoi !== undefined) where.taoBoi = taoBoi;

    const baiThi = await this.baiThiRepo.findOne({
      where,
      relations: { cauHoiBaiThis: { cauHoi: { luaChons: true } } },
      order: { cauHoiBaiThis: { thuTu: 'ASC' } },
    });
    if (!baiThi) throw new NotFoundException('Đề thi không tồn tại');
    return baiThi;
  }

  async create(dto: CreateExamDto, taoBoi: number) {
    await this.validateCauHois(dto.cauHois, taoBoi);

    return this.dataSource
      .transaction(async (em) => {
        const baiThi = await em.save(
          BaiThi,
          em.create(BaiThi, {
            tieuDe: dto.tieuDe,
            maMonHoc: dto.maMonHoc,
            thoiGianLamBai: dto.thoiGianLamBai,
            trangThai: dto.trangThai,
            taoBoi,
          }),
        );

        await Promise.all(
          dto.cauHois.map((ch) =>
            em.save(
              CauHoiBaiThi,
              em.create(CauHoiBaiThi, {
                maBaiThi: baiThi.maBaiThi,
                maCauHoi: ch.maCauHoi,
                thuTu: ch.thuTu,
              }),
            ),
          ),
        );

        return baiThi.maBaiThi;
      })
      .then((maBaiThi) => this.findOne(maBaiThi, taoBoi));
  }

  async update(id: number, dto: UpdateExamDto, taoBoi?: number) {
    await this.findOne(id, taoBoi);

    if (dto.cauHois) await this.validateCauHois(dto.cauHois, taoBoi);

    return this.dataSource
      .transaction(async (em) => {
        await em.update(BaiThi, id, {
          tieuDe: dto.tieuDe,
          maMonHoc: dto.maMonHoc,
          thoiGianLamBai: dto.thoiGianLamBai,
          trangThai: dto.trangThai,
        });

        if (dto.cauHois) {
          await em.delete(CauHoiBaiThi, { maBaiThi: id });
          await Promise.all(
            dto.cauHois.map((ch) =>
              em.save(
                CauHoiBaiThi,
                em.create(CauHoiBaiThi, {
                  maBaiThi: id,
                  maCauHoi: ch.maCauHoi,
                  thuTu: ch.thuTu,
                }),
              ),
            ),
          );
        }

        return id;
      })
      .then(() => this.findOne(id, taoBoi));
  }

  async updateStatus(id: number, trangThai: TrangThaiBaiThi, taoBoi?: number) {
    const baiThi = await this.findOne(id, taoBoi);

    // Chỉ cho công khai đề thi đã có câu hỏi (đề công khai mới được đưa vào phòng thi)
    if (
      trangThai === TrangThaiBaiThi.CONG_KHAI &&
      baiThi.cauHoiBaiThis.length === 0
    )
      throw new BadRequestException(
        'Không thể công khai đề thi chưa có câu hỏi',
      );

    baiThi.trangThai = trangThai;
    return this.baiThiRepo.save(baiThi);
  }

  async remove(id: number, taoBoi?: number) {
    const baiThi = await this.findOne(id, taoBoi);

    // Không cho xóa đề thi khi còn phòng thi đang hoạt động (đang chờ / đang diễn ra)
    const phongHoatDong = await this.phongThiRepo.countBy({
      maBaiThi: id,
      trangThai: In([
        TrangThaiPhongThi.DANG_CHO,
        TrangThaiPhongThi.DANG_DIEN_RA,
      ]),
    });
    if (phongHoatDong > 0)
      throw new BadRequestException(
        'Không thể xóa đề thi khi còn đề thi đang được sử dụng',
      );

    await this.baiThiRepo.remove(baiThi);
    return null;
  }

  // Đảm bảo các câu hỏi tồn tại (và thuộc về người tạo nếu không phải admin), không trùng thuTu
  private async validateCauHois(
    cauHois: ExamQuestionOrderDto[],
    taoBoi?: number,
  ) {
    if (!cauHois || cauHois.length === 0)
      throw new BadRequestException('Đề thi phải có ít nhất 1 câu hỏi');

    const maCauHois = cauHois.map((ch) => ch.maCauHoi);
    if (new Set(maCauHois).size !== maCauHois.length)
      throw new BadRequestException('Danh sách câu hỏi bị trùng');

    const thuTus = cauHois.map((ch) => ch.thuTu);
    if (new Set(thuTus).size !== thuTus.length)
      throw new BadRequestException('Thứ tự câu hỏi bị trùng');

    const where: any = { maCauHoi: In(maCauHois) };
    if (taoBoi !== undefined) where.taoBoi = taoBoi;

    const found = await this.dataSource.getRepository(CauHoi).count({ where });
    if (found !== maCauHois.length)
      throw new BadRequestException(
        'Một số câu hỏi không tồn tại hoặc không thuộc quyền sở hữu',
      );
  }
}
