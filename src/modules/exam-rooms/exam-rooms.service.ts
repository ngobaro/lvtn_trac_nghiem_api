import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PhongThi } from './entities/phong-thi.entity';
import { ThanhVienPhong } from './entities/thanh-vien-phong.entity';
import { BaiThi } from '../exams/entities/bai-thi.entity';
import { CauHoiBaiThi } from '../exams/entities/cau-hoi-bai-thi.entity';
import { CreateExamRoomDto } from './dto/create-exam-room.dto';
import { QueryExamRoomDto } from './dto/query-exam-room.dto';
import { TrangThaiBaiThi } from '../../common/enums/trang-thai-bai-thi.enum';
import { TrangThaiPhongThi } from '../../common/enums/trang-thai-phong-thi.enum';
import { CheDoCauHoi } from '../../common/enums/che-do-cau-hoi.enum';
import { ExamSessionsService } from '../exam-sessions/exam-sessions.service';

// Các bước chuyển trạng thái phòng thi hợp lệ
const TRANSITIONS: Record<TrangThaiPhongThi, TrangThaiPhongThi[]> = {
  [TrangThaiPhongThi.DANG_CHO]: [
    TrangThaiPhongThi.DANG_DIEN_RA,
    TrangThaiPhongThi.DA_DONG,
  ],
  [TrangThaiPhongThi.DANG_DIEN_RA]: [TrangThaiPhongThi.DA_DONG],
  [TrangThaiPhongThi.DA_DONG]: [],
};

@Injectable()
export class ExamRoomsService {
  constructor(
    @InjectRepository(PhongThi) private phongThiRepo: Repository<PhongThi>,
    @InjectRepository(ThanhVienPhong)
    private thanhVienRepo: Repository<ThanhVienPhong>,
    @InjectRepository(BaiThi) private baiThiRepo: Repository<BaiThi>,
    private dataSource: DataSource,
    private examSessionsService: ExamSessionsService,
  ) {}

  // taoBoi = undefined => admin, không filter theo người tạo
  async findAll(query: QueryExamRoomDto, taoBoi?: number) {
    const { page = 1, limit = 20, search, maMonHoc, trangThai } = query;

    const qb = this.phongThiRepo
      .createQueryBuilder('pt')
      .leftJoinAndSelect('pt.baiThi', 'bt')
      .leftJoinAndSelect('bt.monHoc', 'mh');

    if (taoBoi !== undefined) qb.andWhere('pt.taoBoi = :taoBoi', { taoBoi });
    if (search) qb.andWhere('bt.tieuDe LIKE :s', { s: `%${search}%` });
    if (maMonHoc !== undefined)
      qb.andWhere('bt.maMonHoc = :maMonHoc', { maMonHoc });
    if (trangThai) qb.andWhere('pt.trangThai = :trangThai', { trangThai });

    const [items, total] = await qb
      .orderBy('pt.maPhongThi', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  // taoBoi = undefined => admin bypass ownership check
  async findOne(id: number, taoBoi?: number) {
    const where: any = { maPhongThi: id };
    if (taoBoi !== undefined) where.taoBoi = taoBoi;

    const phongThi = await this.phongThiRepo.findOne({
      where: where,
      relations: { baiThi: true, thanhViens: { nguoiDung: true } },
    });
    if (!phongThi) throw new NotFoundException('Phòng thi không tồn tại');
    return phongThi;
  }

  async create(dto: CreateExamRoomDto, taoBoi: number) {
    const moLuc = new Date(dto.moLuc);
    const dongLuc = new Date(dto.dongLuc);
    if (moLuc >= dongLuc)
      throw new BadRequestException(
        'Thời gian mở phòng phải trước thời gian đóng phòng',
      );
    if (dongLuc <= new Date())
      throw new BadRequestException('Thời gian đóng phòng phải ở tương lai');

    // Đề thi phải tồn tại, thuộc quyền sở hữu và đã công khai mới được tạo phòng
    const baiThi = await this.baiThiRepo.findOne({
      where: { maBaiThi: dto.maBaiThi, taoBoi },
    });
    if (!baiThi)
      throw new NotFoundException(
        'Đề thi không tồn tại hoặc không thuộc quyền sở hữu',
      );
    if (baiThi.trangThai !== TrangThaiBaiThi.CONG_KHAI)
      throw new BadRequestException(
        'Chỉ đề thi đã công khai mới được tạo phòng thi',
      );

    // Chế độ ngẫu nhiên cần số câu chọn hợp lệ
    if (dto.cheDoCauHoi === CheDoCauHoi.NGAU_NHIEN) {
      const tongCauHoi = await this.dataSource
        .getRepository(CauHoiBaiThi)
        .countBy({ maBaiThi: dto.maBaiThi });
      if (!dto.soCauChon)
        throw new BadRequestException('Chế độ ngẫu nhiên phải có số câu chọn');
      if (dto.soCauChon > tongCauHoi)
        throw new BadRequestException(
          'Số câu chọn vượt quá số câu hỏi của đề thi',
        );
    }

    const maThamGiaPhong = await this.generateMaThamGiaPhong();

    const phongThi = this.phongThiRepo.create({
      maBaiThi: dto.maBaiThi,
      cheDoCauHoi: dto.cheDoCauHoi,
      soCauChon: dto.soCauChon,
      moLuc,
      dongLuc,
      soNguoiThamGia: dto.soNguoiThamGia,
      maThamGiaPhong,
      trangThai: TrangThaiPhongThi.DANG_CHO,
      taoBoi,
    });
    return this.phongThiRepo.save(phongThi);
  }

  async updateStatus(
    id: number,
    trangThai: TrangThaiPhongThi,
    taoBoi?: number,
  ) {
    const phongThi = await this.findOne(id, taoBoi);

    if (phongThi.trangThai === trangThai) return phongThi;
    if (!TRANSITIONS[phongThi.trangThai].includes(trangThai))
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ "${phongThi.trangThai}" sang "${trangThai}"`,
      );

    phongThi.trangThai = trangThai;
    const daLuu = await this.phongThiRepo.save(phongThi);

    // Đóng phòng -> chốt mọi bài làm còn đang làm (kể cả đóng sớm trước dongLuc)
    if (trangThai === TrangThaiPhongThi.DA_DONG)
      await this.examSessionsService.chotBaiLamCuaPhong(phongThi.maPhongThi);

    return daLuu;
  }

  async getMembers(id: number, taoBoi?: number) {
    await this.findOne(id, taoBoi);
    return this.thanhVienRepo.find({
      where: { maPhongThi: id },
      relations: { nguoiDung: true },
    });
  }

  // Sinh mã tham gia phòng duy nhất (6 ký tự chữ + số viết hoa)
  private async generateMaThamGiaPhong(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++)
        code += chars[Math.floor(Math.random() * chars.length)];
      const existed = await this.phongThiRepo.countBy({ maThamGiaPhong: code });
      if (existed === 0) return code;
    }
    throw new BadRequestException(
      'Không thể sinh mã tham gia phòng, vui lòng thử lại',
    );
  }
}
