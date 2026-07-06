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
import { SubjectOfferingsService } from './subject-offerings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CreateSubjectOfferingDto } from './dto/create-subject-offering.dto';
import { UpdateSubjectOfferingDto } from './dto/update-subject-offering.dto';
import { QuerySubjectOfferingDto } from './dto/query-subject-offering.dto';

@Controller('subject-offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectOfferingsController {
  constructor(
    private readonly subjectOfferingsService: SubjectOfferingsService,
  ) {}

  @Get()
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy danh sách môn học của học kỳ thành công')
  findAll(@Query() query: QuerySubjectOfferingDto) {
    return this.subjectOfferingsService.findAll(query);
  }

  // Giáo viên: các môn-học-kỳ mình được phân dạy (dùng khi tạo đề thi).
  @Get('me/teaching')
  @Roles(VaiTro.GIAO_VIEN)
  @ResponseMessage('Lấy danh sách môn học được phân dạy thành công')
  layDangDay(@CurrentUser() user: CurrentUserPayload) {
    return this.subjectOfferingsService.layDangDay(user.maNguoiDung);
  }

  // Học sinh: các môn-học-kỳ mình đã được ghi danh.
  @Get('me/enrolled')
  @Roles(VaiTro.HOC_SINH)
  @ResponseMessage('Lấy danh sách môn học đã ghi danh thành công')
  layDaGhiDanh(@CurrentUser() user: CurrentUserPayload) {
    return this.subjectOfferingsService.layDaGhiDanh(user.maNguoiDung);
  }

  @Get(':id')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy thông tin môn học của học kỳ thành công')
  findOne(@Param('id') id: number) {
    return this.subjectOfferingsService.findOne(+id);
  }

  @Post()
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Mở môn học cho học kỳ thành công')
  create(@Body() dto: CreateSubjectOfferingDto) {
    return this.subjectOfferingsService.create(dto);
  }

  @Patch(':id')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Cập nhật môn học của học kỳ thành công')
  update(@Param('id') id: number, @Body() dto: UpdateSubjectOfferingDto) {
    return this.subjectOfferingsService.update(+id, dto);
  }

  @Patch(':id/status')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Cập nhật trạng thái môn học của học kỳ thành công')
  updateStatus(
    @Param('id') id: number,
    @Body('laHoatDong') laHoatDong: boolean,
  ) {
    return this.subjectOfferingsService.updateStatus(+id, laHoatDong);
  }

  @Delete(':id')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Xóa môn học của học kỳ thành công')
  remove(@Param('id') id: number) {
    return this.subjectOfferingsService.remove(+id);
  }
}
