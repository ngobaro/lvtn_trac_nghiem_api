import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { RegisterEnrollmentDto } from './dto/register-enrollment.dto';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';

@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  // Admin: xem danh sách học sinh đã đăng ký theo môn-học-kỳ.
  @Get()
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy danh sách đăng ký thành công')
  findAll(@Query() query: QueryEnrollmentDto) {
    return this.enrollmentsService.findAll(query);
  }

  // Học sinh: các môn-học-kỳ đăng ký được (kèm cờ đã đăng ký).
  @Get('available')
  @Roles(VaiTro.HOC_SINH)
  @ResponseMessage('Lấy danh sách môn học đăng ký được thành công')
  layMonKhaDung(@CurrentUser() user: CurrentUserPayload) {
    return this.enrollmentsService.layMonKhaDung(user.maNguoiDung);
  }

  // Học sinh: tự đăng ký 1 môn-học-kỳ.
  @Post('register')
  @Roles(VaiTro.HOC_SINH)
  @ResponseMessage('Đăng ký môn học thành công')
  dangKy(
    @Body() dto: RegisterEnrollmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.enrollmentsService.dangKy(user.maNguoiDung, dto.maMonHocHocKy);
  }

  // Học sinh: tự hủy đăng ký 1 môn-học-kỳ.
  @Delete('register/:maMonHocHocKy')
  @Roles(VaiTro.HOC_SINH)
  @ResponseMessage('Hủy đăng ký môn học thành công')
  huyDangKy(
    @Param('maMonHocHocKy') maMonHocHocKy: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.enrollmentsService.huyDangKy(user.maNguoiDung, +maMonHocHocKy);
  }
}
