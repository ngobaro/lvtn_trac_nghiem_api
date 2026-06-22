import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { VaiTro } from 'src/common/enums/vai-tro.enum';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';

@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(VaiTro.GIAO_VIEN, VaiTro.QUAN_TRI_VIEN)
export class SubjectsController {
    constructor(
        private readonly subjectsService: SubjectsService
    ) { }

    @Get()
    @ResponseMessage('Lấy danh sách môn học thành công')
    findAll(
        @Query('page') page: number,
        @Query('limit') limit: number,
        @CurrentUser() user: any,
    ) {
        const maNguoiDung = user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
        return this.subjectsService.findAll(+page, +limit, maNguoiDung);
    }

    @Get(':id')
    @ResponseMessage('Lấy thông tin môn học thành công')
    findOne(@Param('id') id: number, @CurrentUser() user: any) {
        const maNguoiDung = user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
        return this.subjectsService.findOne(+id, maNguoiDung);
    }

    @Post()
    @ResponseMessage('Tạo môn học thành công')
    create(@Body() dto: CreateSubjectDto, @CurrentUser() user: any) {
        return this.subjectsService.create(dto, user.maNguoiDung);
    }

    @Patch(':id')
    @ResponseMessage('Cập nhật thông tin môn học thành công')
    update(@Param('id') id: number, @Body() dto: UpdateSubjectDto, @CurrentUser() user: any) {
        const maNguoiDung = user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
        return this.subjectsService.update(+id, dto, maNguoiDung);
    }

    @Delete(':id')
    @ResponseMessage('Xóa môn học thành công')
    remove(@Param('id') id: number, @CurrentUser() user: any) {
        const maNguoiDung = user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
        return this.subjectsService.remove(+id, maNguoiDung);
    }

    @Patch(':id/status')
    @ResponseMessage('Cập nhật trạng thái môn học thành công')
    updateStatus(@Param('id') id: number, @Body('laHoatDong') laHoatDong: boolean, @CurrentUser() user: any) {
        const maNguoiDung = user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
        return this.subjectsService.updateStatus(+id, laHoatDong, maNguoiDung);
    }
}
