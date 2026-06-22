import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MonHoc } from './entities/mon-hoc.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
    constructor(
        @InjectRepository(MonHoc)
        private readonly monHocRepo: Repository<MonHoc>
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
        const monHoc = this.monHocRepo.create({ ...dto, maNguoiDung });
        return await this.monHocRepo.save(monHoc);
    }

    async update(id: number, dto: UpdateSubjectDto, maNguoiDung?: number) {
        const monHoc = await this.findOne(id, maNguoiDung);
        return await this.monHocRepo.save({ ...monHoc, ...dto });
    }

    async remove(id: number, maNguoiDung?: number) {
        const monHoc = await this.findOne(id, maNguoiDung);
        await this.monHocRepo.remove(monHoc);
        return null;
    }

    async updateStatus(id: number, laHoatDong: boolean, maNguoiDung?: number) {
        const monHoc = await this.findOne(id, maNguoiDung);
        monHoc.laHoatDong = laHoatDong;
        return this.monHocRepo.save(monHoc);
    }
}