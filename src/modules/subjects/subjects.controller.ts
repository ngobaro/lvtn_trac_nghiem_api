import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { VaiTro } from 'src/common/enums/vai-tro.enum';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { QuerySubjectDto } from './dto/query-subject.dto';

// Môn học: GV/HS được xem (dùng cho dropdown), chỉ Admin được ghi.
@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @Roles(VaiTro.HOC_SINH, VaiTro.GIAO_VIEN, VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy danh sách môn học thành công')
  findAll(@Query() query: QuerySubjectDto) {
    return this.subjectsService.findAll(query);
  }

  @Get(':id')
  @Roles(VaiTro.HOC_SINH, VaiTro.GIAO_VIEN, VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy thông tin môn học thành công')
  findOne(@Param('id') id: number) {
    return this.subjectsService.findOne(+id);
  }

  @Post()
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Tạo môn học thành công')
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Patch(':id')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Cập nhật thông tin môn học thành công')
  update(@Param('id') id: number, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.update(+id, dto);
  }

  @Patch(':id/status')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Cập nhật trạng thái môn học thành công')
  updateStatus(
    @Param('id') id: number,
    @Body('laHoatDong') laHoatDong: boolean,
  ) {
    return this.subjectsService.updateStatus(+id, laHoatDong);
  }

  @Delete(':id')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Xóa môn học thành công')
  remove(@Param('id') id: number) {
    return this.subjectsService.remove(+id);
  }
}
