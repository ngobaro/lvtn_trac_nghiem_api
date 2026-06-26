import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { MonHoc } from './entities/mon-hoc.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CauHoi } from '../questions/entities/cau-hoi.entity';
import { BaiThi } from '../exams/entities/bai-thi.entity';

@Injectable()
export class SubjectsService {
    constructor(
        @InjectRepository(MonHoc)
        private readonly monHocRepo: Repository<MonHoc>,
        private readonly dataSource: DataSource,
    ) { }

    // maNguoiDung = undefined => admin, lấy toàn bộ
    async findAll(page = 1, limit = 20, maNguoiDung?: number) {
        const where = maNguoiDung !== undefined ? { maNguoiDung } : {};

        const [items, total] = await this.monHocRepo.findAndCount({
            where: where,
            skip: (page - 1) * limit,
            take: limit,
        });
        return { items, total, page, limit };
    }

    // maNguoiDung = undefined => admin bypass ownership check
    async findOne(id: number, maNguoiDung?: number) {
        const where: any = { maMonHoc: id };
        if (maNguoiDung !== undefined) where.maNguoiDung = maNguoiDung;

        const monHoc = await this.monHocRepo.findOne({ where });
        if (!monHoc) throw new NotFoundException('Môn học không tồn tại');
        return monHoc;
    }

    async create(dto: CreateSubjectDto, maNguoiDung: number) {
        await this.kiemTraTrung(maNguoiDung, dto.tenMonHoc, dto.maDinhDanhMon);
        const monHoc = this.monHocRepo.create({ ...dto, maNguoiDung });
        return await this.monHocRepo.save(monHoc);
    }

    async update(id: number, dto: UpdateSubjectDto, maNguoiDung?: number) {
        const monHoc = await this.findOne(id, maNguoiDung);
        await this.kiemTraTrung(
            monHoc.maNguoiDung,
            dto.tenMonHoc,
            dto.maDinhDanhMon,
            id,
        );
        return await this.monHocRepo.save({ ...monHoc, ...dto });
    }

    // Kiểm tra trùng tên môn / mã định danh trong phạm vi cùng người sở hữu.
    // boQuaId: bỏ qua chính bản ghi đang cập nhật.
    private async kiemTraTrung(
        maNguoiDung: number,
        tenMonHoc?: string,
        maDinhDanhMon?: string,
        boQuaId?: number,
    ) {
        if (tenMonHoc) {
            const qb = this.monHocRepo
                .createQueryBuilder('m')
                .where('m.maNguoiDung = :maNguoiDung', { maNguoiDung })
                .andWhere('m.tenMonHoc = :tenMonHoc', { tenMonHoc });
            if (boQuaId) qb.andWhere('m.maMonHoc != :boQuaId', { boQuaId });
            if (await qb.getCount())
                throw new BadRequestException('Tên môn học đã tồn tại');
        }

        if (maDinhDanhMon) {
            const qb = this.monHocRepo
                .createQueryBuilder('m')
                .where('m.maNguoiDung = :maNguoiDung', { maNguoiDung })
                .andWhere('m.maDinhDanhMon = :maDinhDanhMon', { maDinhDanhMon });
            if (boQuaId) qb.andWhere('m.maMonHoc != :boQuaId', { boQuaId });
            if (await qb.getCount())
                throw new BadRequestException('Mã định danh môn đã tồn tại');
        }
    }

    async remove(id: number, maNguoiDung?: number) {
        const monHoc = await this.findOne(id, maNguoiDung);

        // Chặn xóa khi còn câu hỏi / đề thi tham chiếu (tránh lỗi khóa ngoại 500).
        const soCauHoi = await this.dataSource
            .getRepository(CauHoi)
            .countBy({ maMonHoc: id });
        if (soCauHoi > 0)
            throw new BadRequestException(
                'Không thể xóa môn học khi vẫn còn câu hỏi thuộc môn này',
            );

        const soBaiThi = await this.dataSource
            .getRepository(BaiThi)
            .countBy({ maMonHoc: id });
        if (soBaiThi > 0)
            throw new BadRequestException(
                'Không thể xóa môn học khi vẫn còn đề thi thuộc môn này',
            );

        await this.monHocRepo.remove(monHoc);
        return null;
    }

    async updateStatus(id: number, laHoatDong: boolean, maNguoiDung?: number) {
        const monHoc = await this.findOne(id, maNguoiDung);
        monHoc.laHoatDong = laHoatDong;
        return this.monHocRepo.save(monHoc);
    }
}