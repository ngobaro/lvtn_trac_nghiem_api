import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CauHoi } from './entities/cau-hoi.entity';
import { LuaChon } from './entities/lua-chon.entity';
import { DapAn } from './entities/dap-an.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { LoaiCauHoi } from '../../common/enums/loai-cau-hoi.enum';
import { AppwriteService } from '../../common/services/appwrite.service';

@Injectable()
export class QuestionsService {
    constructor(
        @InjectRepository(CauHoi) private cauHoiRepo: Repository<CauHoi>,
        @InjectRepository(LuaChon) private luaChonRepo: Repository<LuaChon>,
        @InjectRepository(DapAn) private dapAnRepo: Repository<DapAn>,
        private dataSource: DataSource,
        private appwriteService: AppwriteService,
    ) { }

    // taoBoi = undefined => admin, không filter theo người tạo
    async findAll(page = 1, limit = 20, taoBoi?: number) {
        const where = taoBoi !== undefined ? { taoBoi } : {};

        const [items, total] = await this.cauHoiRepo.findAndCount({
            where: where,
            skip: (page - 1) * limit,
            take: limit,
            relations: { luaChons: true },
        });
        return { items, total, page, limit };
    }

    // taoBoi = undefined => admin bypass ownership check
    async findOne(id: number, taoBoi?: number) {
        const where: any = { maCauHoi: id };
        if (taoBoi !== undefined) where.taoBoi = taoBoi;

        const cauHoi = await this.cauHoiRepo.findOne({
            where,
            relations: { luaChons: true },
        });
        if (!cauHoi) throw new NotFoundException('Câu hỏi không tồn tại');
        return cauHoi;
    }

    async create(dto: CreateQuestionDto, taoBoi: number) {
        const dung = dto.luaChons.filter((lc) => lc.laDapAnDung);
        if (dto.loaiCauHoi === LoaiCauHoi.MOT_DAP_AN && dung.length !== 1)
            throw new BadRequestException('Câu hỏi 1 đáp án phải có đúng 1 đáp án đúng');
        if (dto.loaiCauHoi === LoaiCauHoi.NHIEU_DAP_AN && dung.length < 2)
            throw new BadRequestException('Câu hỏi nhiều đáp án phải có ít nhất 2 đáp án đúng');

        return this.dataSource.transaction(async (em) => {
            const cauHoi = await em.save(CauHoi, em.create(CauHoi, {
                noiDung: dto.noiDung,
                maMonHoc: dto.maMonHoc,
                doKho: dto.doKho,
                loaiCauHoi: dto.loaiCauHoi,
                taoBoi,
            }));

            const savedLuaChons = await Promise.all(
                dto.luaChons.map((lc) =>
                    em.save(LuaChon, em.create(LuaChon, {
                        maCauHoi: cauHoi.maCauHoi,
                        noiDung: lc.noiDung,
                    })),
                ),
            );

            for (let i = 0; i < savedLuaChons.length; i++) {
                if (dto.luaChons[i].laDapAnDung) {
                    await em.save(DapAn, { maLuaChon: savedLuaChons[i].maLuaChon });
                }
            }

            return cauHoi;
        });
    }

    async update(id: number, dto: UpdateQuestionDto, taoBoi: number) {
        await this.findOne(id, taoBoi);
        return this.dataSource.transaction(async (em) => {
            await em.update(CauHoi, id, {
                noiDung: dto.noiDung,
                doKho: dto.doKho,
                maMonHoc: dto.maMonHoc,
            });

            if (dto.luaChons) {
                await em.delete(LuaChon, { maCauHoi: id });
                const saved = await Promise.all(
                    dto.luaChons.map((lc) =>
                        em.save(LuaChon, em.create(LuaChon, { maCauHoi: id, noiDung: lc.noiDung })),
                    ),
                );
                for (let i = 0; i < saved.length; i++) {
                    if (dto.luaChons[i].laDapAnDung) {
                        await em.save(DapAn, { maLuaChon: saved[i].maLuaChon });
                    }
                }
            }

            return this.findOne(id, taoBoi);
        });
    }

    async remove(id: number, taoBoi: number) {
        const cauHoi = await this.findOne(id, taoBoi);
        await this.cauHoiRepo.remove(cauHoi);
        return null;
    }

    async updateImage(id: number, file: Express.Multer.File, taoBoi: number) {
        const cauHoi = await this.findOne(id, taoBoi);
        const url = await this.appwriteService.uploadFile(file);
        cauHoi.hinhAnh = url;
        return this.cauHoiRepo.save(cauHoi);
    }
}