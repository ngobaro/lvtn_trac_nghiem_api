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
import { PhongThiBaiThi } from '../exam-rooms/entities/phong-thi-bai-thi.entity';
import { PhanCongGiangDay } from '../teaching-assignments/entities/phan-cong-giang-day.entity';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamQuestionOrderDto } from './dto/exam-question-order.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { TrangThaiBaiThi } from '../../common/enums/trang-thai-bai-thi.enum';
import { BaiLam } from '../exam-sessions/entities/bai-lam.entity';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(BaiThi) private baiThiRepo: Repository<BaiThi>,
    @InjectRepository(PhongThiBaiThi)
    private phongThiBaiThiRepo: Repository<PhongThiBaiThi>,
    @InjectRepository(PhanCongGiangDay)
    private phanCongRepo: Repository<PhanCongGiangDay>,
    private dataSource: DataSource,
  ) {}

  // taoBoi = undefined => admin, không filter theo người tạo
  async findAll(query: QueryExamDto, taoBoi?: number) {
    const { page = 1, limit = 10, search, maMonHocHocKy, trangThai } = query;

    const qb = this.baiThiRepo
      .createQueryBuilder('bt')
      .leftJoinAndSelect('bt.monHocHocKy', 'mhhk')
      .leftJoinAndSelect('mhhk.monHoc', 'monHoc')
      .leftJoinAndSelect('mhhk.hocKy', 'hocKy')
      .leftJoinAndSelect('bt.nguoiTao', 'nguoiTao');

    if (taoBoi !== undefined) qb.andWhere('bt.taoBoi = :taoBoi', { taoBoi });
    if (search) qb.andWhere('bt.tieuDe LIKE :s', { s: `%${search}%` });
    if (maMonHocHocKy !== undefined)
      qb.andWhere('bt.maMonHocHocKy = :maMonHocHocKy', { maMonHocHocKy });
    if (trangThai) qb.andWhere('bt.trangThai = :trangThai', { trangThai });

    const [items, total] = await qb
      .orderBy('bt.maBaiThi', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  // taoBoi = undefined => admin bypass ownership check
  async findOne(id: number, taoBoi?: number) {
    const where: any = { maBaiThi: id };
    if (taoBoi !== undefined) where.taoBoi = taoBoi;

    const baiThi = await this.baiThiRepo.findOne({
      where,
      relations: {
        cauHoiBaiThis: { cauHoi: { luaChons: true } },
        monHocHocKy: { monHoc: true, hocKy: true },
      },
      order: { cauHoiBaiThis: { thuTu: 'ASC' } },
    });
    if (!baiThi) throw new NotFoundException('Đề thi không tồn tại');

    // Gán cờ daSuDung để FE khóa việc thay đổi câu hỏi.
    const { daThi, coPhong } = await this.kiemTraDaSuDung(id);
    baiThi.daSuDung = daThi || coPhong;
    return baiThi;
  }

  // Đề được coi là "đã sử dụng" khi đã có bài làm của học sinh (daThi)
  // hoặc đã được đưa vào phòng thi (coPhong). Khi đó danh sách câu hỏi
  // phải được đóng băng để giữ toàn vẹn phòng thi & kết quả đã chấm.
  private async kiemTraDaSuDung(maBaiThi: number) {
    const [soBaiLam, soPhong] = await Promise.all([
      this.dataSource.getRepository(BaiLam).countBy({ maBaiThi }),
      this.phongThiBaiThiRepo.countBy({ maBaiThi }),
    ]);
    return { daThi: soBaiLam > 0, coPhong: soPhong > 0 };
  }

  // Kiểm tra giáo viên có được phân dạy môn-học-kỳ này không.
  private async kiemTraPhanCong(maMonHocHocKy: number, taoBoi: number) {
    const pc = await this.phanCongRepo.findOne({
      where: { maMonHocHocKy, maGiaoVien: taoBoi },
    });
    if (!pc)
      throw new BadRequestException(
        'Bạn không được phân dạy môn học của học kỳ này',
      );
  }

  async create(dto: CreateExamDto, taoBoi: number) {
    await this.kiemTraPhanCong(dto.maMonHocHocKy, taoBoi);
    await this.validateCauHois(dto.cauHois, taoBoi);

    return this.dataSource
      .transaction(async (em) => {
        const baiThi = await em.save(
          BaiThi,
          em.create(BaiThi, {
            tieuDe: dto.tieuDe,
            maMonHocHocKy: dto.maMonHocHocKy,
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

    // Khóa toàn bộ chỉnh sửa khi đề đã được sử dụng (để giữ toàn vẹn phòng thi & kết quả).
    const { daThi, coPhong } = await this.kiemTraDaSuDung(id);
    if (daThi)
      throw new BadRequestException(
        'Không thể sửa đề thi đã có học sinh làm bài',
      );
    if (coPhong)
      throw new BadRequestException(
        'Không thể sửa đề thi đã được đưa vào phòng thi',
      );

    if (dto.maMonHocHocKy !== undefined && taoBoi !== undefined)
      await this.kiemTraPhanCong(dto.maMonHocHocKy, taoBoi);
    if (dto.cauHois) await this.validateCauHois(dto.cauHois, taoBoi);

    return this.dataSource
      .transaction(async (em) => {
        await em.update(BaiThi, id, {
          tieuDe: dto.tieuDe,
          maMonHocHocKy: dto.maMonHocHocKy,
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

    // "Đã sử dụng" do hệ thống tự đặt khi đưa vào phòng — không cho client tự đặt.
    if (trangThai === TrangThaiBaiThi.DA_SU_DUNG)
      throw new BadRequestException(
        'Trạng thái "Đã sử dụng" do hệ thống tự đặt khi đưa vào phòng thi',
      );
    if (baiThi.trangThai === TrangThaiBaiThi.DA_SU_DUNG)
      throw new BadRequestException(
        'Không thể đổi trạng thái đề thi đã sử dụng',
      );

    // Chỉ cho công khai đề thi đã có câu hỏi (đề công khai mới được đưa vào phòng thi)
    if (
      trangThai === TrangThaiBaiThi.CONG_KHAI &&
      baiThi.cauHoiBaiThis.length === 0
    )
      throw new BadRequestException(
        'Không thể công khai đề thi chưa có câu hỏi',
      );

    // Không cho hạ đề về nháp khi đã đưa vào phòng thi.
    if (
      trangThai === TrangThaiBaiThi.NHAP &&
      baiThi.trangThai === TrangThaiBaiThi.CONG_KHAI
    ) {
      const soPhong = await this.phongThiBaiThiRepo.countBy({ maBaiThi: id });
      if (soPhong > 0)
        throw new BadRequestException(
          'Không thể ẩn đề thi đã được đưa vào phòng thi',
        );
    }

    baiThi.trangThai = trangThai;
    return this.baiThiRepo.save(baiThi);
  }

  async remove(id: number, taoBoi?: number) {
    const baiThi = await this.findOne(id, taoBoi);

    // chỉ xóa được đề nháp chưa dùng. Đề đã có bài làm hoặc đã vào
    // phòng thi thì chặn (giữ toàn vẹn phòng/bài làm/kết quả); trả lỗi tiếng Việt
    // thân thiện thay vì để FK RESTRICT ném lỗi thô.
    const { daThi, coPhong } = await this.kiemTraDaSuDung(id);
    if (daThi)
      throw new BadRequestException(
        'Không thể xóa đề thi đã có học sinh làm bài',
      );
    if (coPhong)
      throw new BadRequestException('Không thể xóa đề thi đã sử dụng');

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
