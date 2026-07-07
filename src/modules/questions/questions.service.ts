import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CauHoi } from './entities/cau-hoi.entity';
import { LuaChon } from './entities/lua-chon.entity';
import { DapAn } from './entities/dap-an.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { LoaiCauHoi } from '../../common/enums/loai-cau-hoi.enum';
import { AppwriteService } from '../../common/services/appwrite.service';
import { GeminiService } from './services/gemini.service';
import { DocumentParserService } from './services/document-parser.service';
import { EntityManager } from 'typeorm';
import { CauHoiBaiThi } from '../exams/entities/cau-hoi-bai-thi.entity';
import { CauHoiBaiLam } from '../exam-sessions/entities/cau-hoi-bai-lam.entity';
import { BaiThi } from '../exams/entities/bai-thi.entity';
import { TrangThaiBaiThi } from '../../common/enums/trang-thai-bai-thi.enum';

@Injectable()
export class QuestionsService {
    private readonly logger = new Logger(QuestionsService.name);

    constructor(
        @InjectRepository(CauHoi) private cauHoiRepo: Repository<CauHoi>,
        @InjectRepository(LuaChon) private luaChonRepo: Repository<LuaChon>,
        @InjectRepository(DapAn) private dapAnRepo: Repository<DapAn>,
        private dataSource: DataSource,
        private appwriteService: AppwriteService,
        private geminiService: GeminiService,
        private documentParserService: DocumentParserService,
    ) { }

    // taoBoi = undefined => admin, không filter theo người tạo
    async findAll(query: QueryQuestionDto, taoBoi?: number) {
        const { page = 1, limit = 10, search, maMonHoc, doKho, loaiCauHoi } = query;

        const qb = this.cauHoiRepo
            .createQueryBuilder('ch')
            .leftJoinAndSelect('ch.luaChons', 'lc')
            .leftJoinAndSelect('ch.nguoiTao', 'nguoiTao');

        if (taoBoi !== undefined)
            qb.andWhere('ch.taoBoi = :taoBoi', { taoBoi });
        if (search)
            qb.andWhere('ch.noiDung LIKE :s', { s: `%${search}%` });
        if (maMonHoc !== undefined)
            qb.andWhere('ch.maMonHoc = :maMonHoc', { maMonHoc });
        if (doKho !== undefined)
            qb.andWhere('ch.doKho = :doKho', { doKho });
        if (loaiCauHoi !== undefined)
            qb.andWhere('ch.loaiCauHoi = :loaiCauHoi', { loaiCauHoi });

        const [items, total] = await qb
            .orderBy('ch.maCauHoi', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { items, total, page, limit };
    }

    // taoBoi = undefined => admin bypass ownership check
    async findOne(id: number, taoBoi?: number) {
        const where: any = { maCauHoi: id };
        if (taoBoi !== undefined) where.taoBoi = taoBoi;

        const cauHoi = await this.cauHoiRepo.findOne({
            where,
            relations: { luaChons: true, nguoiTao: true },
        });
        if (!cauHoi) throw new NotFoundException('Câu hỏi không tồn tại');

        await this.danhDauDapAnDung(cauHoi.luaChons);
        return cauHoi;
    }

    // Đính cờ laDapAnDung cho từng lựa chọn dựa trên bảng DAP_AN.
    private async danhDauDapAnDung(luaChons: LuaChon[] = []) {
        const ids = luaChons.map((lc) => lc.maLuaChon);
        if (ids.length === 0) return;
        const dapAns = await this.dapAnRepo.findBy({ maLuaChon: In(ids) });
        const dungSet = new Set(dapAns.map((d) => d.maLuaChon));
        luaChons.forEach((lc) => (lc.laDapAnDung = dungSet.has(lc.maLuaChon)));
    }

    async create(dto: CreateQuestionDto, taoBoi: number) {
        return this.dataSource.transaction((em) =>
            this.taoTrongTransaction(em, dto, taoBoi),
        );
    }

    // Đọc file (Word/PDF) -> trích xuất câu hỏi bằng AI.
    // CHỈ trả về dữ liệu nháp cho FE xem trước/chỉnh sửa, KHÔNG ghi vào DB.
    async nhapTuFile(file: Express.Multer.File) {
        const vanBan = await this.documentParserService.docFromBuffer(file);
        const cauHois = await this.geminiService.trichXuatCauHoi(vanBan);
        if (cauHois.length === 0)
            throw new BadRequestException(
                'Không tìm thấy câu hỏi trắc nghiệm nào trong file',
            );
        return { cauHois };
    }

    // Lưu hàng loạt câu hỏi (sau khi người dùng xác nhận ở bước xem trước).
    // Toàn bộ chạy trong 1 transaction: lỗi 1 câu thì rollback tất cả.
    async createNhieu(cauHois: CreateQuestionDto[], taoBoi: number) {
        return this.dataSource.transaction(async (em) => {
            const ketQua: CauHoi[] = [];
            for (let i = 0; i < cauHois.length; i++) {
                try {
                    ketQua.push(await this.taoTrongTransaction(em, cauHois[i], taoBoi));
                } catch (e) {
                    const lyDo =
                        e instanceof BadRequestException
                            ? (e.getResponse() as any)?.message || e.message
                            : (e as Error).message;
                    throw new BadRequestException(`Câu ${i + 1}: ${lyDo}`);
                }
            }
            return { soLuong: ketQua.length };
        });
    }

    // Validate số đáp án đúng theo loại + ghi 1 câu hỏi (kèm lựa chọn, đáp án)
    // trong phạm vi transaction được truyền vào. Dùng chung cho create & createNhieu.
    private async taoTrongTransaction(
        em: EntityManager,
        dto: CreateQuestionDto,
        taoBoi: number,
    ) {
        await this.kiemTraTrungNoiDung(dto.noiDung, dto.maMonHoc, undefined, em);

        const dung = dto.luaChons.filter((lc) => lc.laDapAnDung);
        if (dto.loaiCauHoi === LoaiCauHoi.MOT_DAP_AN && dung.length !== 1)
            throw new BadRequestException('Câu hỏi 1 đáp án phải có đúng 1 đáp án đúng');
        if (dto.loaiCauHoi === LoaiCauHoi.NHIEU_DAP_AN && dung.length < 2)
            throw new BadRequestException('Câu hỏi nhiều đáp án phải có ít nhất 2 đáp án đúng');

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
    }

    async update(id: number, dto: UpdateQuestionDto, taoBoi?: number) {
        const cauHoiCu = await this.findOne(id, taoBoi);
        await this.kiemTraCauHoiDaDung(id);
        await this.kiemTraCauHoiDaThi(id);
        const noiDungMoi = dto.noiDung ?? cauHoiCu.noiDung;
        const maMonHocMoi = dto.maMonHoc ?? cauHoiCu.maMonHoc;
        await this.kiemTraTrungNoiDung(noiDungMoi, maMonHocMoi, id);
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

    async remove(id: number, taoBoi?: number) {
        const cauHoi = await this.findOne(id, taoBoi);
        await this.kiemTraCauHoiDaDung(id);
        await this.kiemTraCauHoiDaThi(id);
        const anhCu = cauHoi.hinhAnh;

        await this.dataSource.transaction(async (em) => {
            // Gỡ câu hỏi khỏi các đề thi (chỉ đề nháp)
            // để tránh lỗi khóa ngoại từ CAU_HOI_BAI_THI.
            await em.delete(CauHoiBaiThi, { maCauHoi: id });
            // Xóa câu hỏi (DB cascade LUA_CHON, DAP_AN).
            await em.remove(cauHoi);
        });

        // Xóa ảnh trên Appwrite sau khi đã xóa câu hỏi
        if (anhCu) {
            try {
                await this.appwriteService.deleteFileByUrl(anhCu);
            } catch (e) {
                this.logger.error(
                    `Không xóa được ảnh của câu hỏi ${id}: ${(e as Error).message}`,
                );
            }
        }

        return null;
    }

    async updateImage(id: number, file: Express.Multer.File, taoBoi?: number) {
        const cauHoi = await this.findOne(id, taoBoi);
        await this.kiemTraCauHoiDaDung(id);

        const anhCu = cauHoi.hinhAnh;
        const url = await this.appwriteService.uploadFile(file);
        cauHoi.hinhAnh = url;
        const daLuu = await this.cauHoiRepo.save(cauHoi);

        // Xóa ảnh cũ sau khi đã lưu ảnh mới thành công
        if (anhCu) {
            try {
                await this.appwriteService.deleteFileByUrl(anhCu);
            } catch (e) {
                this.logger.error(
                    `Không xóa được ảnh cũ của câu hỏi ${id}: ${(e as Error).message}`,
                );
            }
        }

        return daLuu;
    }

    // Câu hỏi thuộc đề thi ĐÃ CÔNG KHAI thì khóa sửa/xóa để giữ ổn định nội dung & đáp án.
    // Câu hỏi chỉ nằm trong đề còn nháp vẫn cho phép sửa.
    private async kiemTraCauHoiDaDung(maCauHoi: number) {
        const daDung = await this.dataSource
            .getRepository(CauHoiBaiThi)
            .createQueryBuilder('chbt')
            .innerJoin(BaiThi, 'bt', 'bt.maBaiThi = chbt.maBaiThi')
            .where('chbt.maCauHoi = :maCauHoi', { maCauHoi })
            .andWhere('bt.trangThai = :trangThai', {
                trangThai: TrangThaiBaiThi.CONG_KHAI,
            })
            .getCount();
        if (daDung > 0)
            throw new BadRequestException(
                'Câu hỏi đã thuộc đề thi đã công khai, không thể sửa hoặc xóa',
            );
    }

    // Câu hỏi đã xuất hiện trong bài làm của học sinh (CAU_HOI_BAI_LAM) thì khóa
    // sửa/xóa để giữ toàn vẹn dữ liệu kết quả đã chấm (và tránh lỗi khóa ngoại).
    private async kiemTraCauHoiDaThi(maCauHoi: number) {
        const daThi = await this.dataSource
            .getRepository(CauHoiBaiLam)
            .countBy({ maCauHoi });
        if (daThi > 0)
            throw new BadRequestException(
                'Câu hỏi đã được sử dụng trong bài thi của học sinh, không thể sửa hoặc xóa',
            );
    }

    // Chặn trùng nội dung câu hỏi trong cùng một môn học.
    // So khớp không phân biệt hoa/thường noiDung đã được trim ở DTO.
    // boQuaId: bỏ qua chính câu đang cập nhật. em: dùng khi gọi trong transaction.
    private async kiemTraTrungNoiDung(
        noiDung: string,
        maMonHoc: number,
        boQuaId?: number,
        em?: EntityManager,
    ) {
        const repo = em ? em.getRepository(CauHoi) : this.cauHoiRepo;
        const qb = repo
            .createQueryBuilder('ch')
            .where('ch.maMonHoc = :maMonHoc', { maMonHoc })
            .andWhere('ch.noiDung = :noiDung', { noiDung });
        if (boQuaId) qb.andWhere('ch.maCauHoi != :boQuaId', { boQuaId });
        if (await qb.getCount())
            throw new BadRequestException(
                'Nội dung câu hỏi đã tồn tại trong môn học này',
            );
    }
}