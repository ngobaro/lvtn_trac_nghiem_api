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
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { UpdateExamStatusDto } from './dto/update-exam-status.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(VaiTro.GIAO_VIEN, VaiTro.QUAN_TRI_VIEN)
export class ExamsController {
  constructor(private examsService: ExamsService) {}

  @Get()
  @ResponseMessage('Lấy danh sách đề thi thành công')
  findAll(
    @Query() query: PaginationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const taoBoi =
      user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
    return this.examsService.findAll(query.page, query.limit, taoBoi);
  }

  @Get(':id')
  @ResponseMessage('Lấy thông tin đề thi thành công')
  findOne(@Param('id') id: number, @CurrentUser() user: CurrentUserPayload) {
    const taoBoi =
      user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
    return this.examsService.findOne(+id, taoBoi);
  }

  @Post()
  @Roles(VaiTro.GIAO_VIEN)
  @ResponseMessage('Tạo đề thi thành công')
  create(@Body() dto: CreateExamDto, @CurrentUser() user: CurrentUserPayload) {
    return this.examsService.create(dto, user.maNguoiDung);
  }

  @Patch(':id')
  @Roles(VaiTro.GIAO_VIEN)
  @ResponseMessage('Cập nhật đề thi thành công')
  update(
    @Param('id') id: number,
    @Body() dto: UpdateExamDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.examsService.update(+id, dto, user.maNguoiDung);
  }

  @Patch(':id/status')
  @Roles(VaiTro.GIAO_VIEN)
  @ResponseMessage('Cập nhật trạng thái đề thi thành công')
  updateStatus(
    @Param('id') id: number,
    @Body() dto: UpdateExamStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.examsService.updateStatus(+id, dto.trangThai, user.maNguoiDung);
  }

  @Delete(':id')
  @Roles(VaiTro.GIAO_VIEN)
  @ResponseMessage('Xóa đề thi thành công')
  remove(@Param('id') id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.examsService.remove(+id, user.maNguoiDung);
  }
}
