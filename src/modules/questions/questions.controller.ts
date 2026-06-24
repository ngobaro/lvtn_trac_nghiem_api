import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(VaiTro.GIAO_VIEN, VaiTro.QUAN_TRI_VIEN)
export class QuestionsController {
    constructor(private questionsService: QuestionsService) { }

    @Get()
    @ResponseMessage('Lấy danh sách câu hỏi thành công')
    findAll(@Query() query: PaginationDto, @CurrentUser() user: CurrentUserPayload) {
        // Admin không truyền taoBoi => lấy toàn bộ
        const taoBoi = user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
        return this.questionsService.findAll(query.page, query.limit, taoBoi);
    }

    @Get(':id')
    @ResponseMessage('Lấy thông tin câu hỏi thành công')
    findOne(@Param('id') id: number, @CurrentUser() user: CurrentUserPayload) {
        const taoBoi = user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
        return this.questionsService.findOne(+id, taoBoi);
    }

    @Post()
    @ResponseMessage('Tạo câu hỏi thành công')
    create(@Body() dto: CreateQuestionDto, @CurrentUser() user: CurrentUserPayload) {
        return this.questionsService.create(dto, user.maNguoiDung);
    }

    @Patch(':id')
    @ResponseMessage('Cập nhật câu hỏi thành công')
    update(
        @Param('id') id: number,
        @Body() dto: UpdateQuestionDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        const taoBoi = user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
        return this.questionsService.update(+id, dto, taoBoi);
    }

    @Delete(':id')
    @ResponseMessage('Xóa câu hỏi thành công')
    remove(@Param('id') id: number, @CurrentUser() user: CurrentUserPayload) {
        const taoBoi = user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
        return this.questionsService.remove(+id, taoBoi);
    }

    @Post(':id/image')
    @ResponseMessage('Cập nhật ảnh câu hỏi thành công')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)/)) {
                return cb(new BadRequestException('Chỉ chấp nhận file ảnh'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    }))
    async uploadImage(
        @Param('id') id: number,
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser() user: CurrentUserPayload
    ) {
        const taoBoi = user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
        return this.questionsService.updateImage(+id, file, taoBoi);
    }
}