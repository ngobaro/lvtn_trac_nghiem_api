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
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { BulkEnrollmentDto } from './dto/bulk-enrollment.dto';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';

@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(VaiTro.QUAN_TRI_VIEN)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  @ResponseMessage('Lấy danh sách ghi danh thành công')
  findAll(@Query() query: QueryEnrollmentDto) {
    return this.enrollmentsService.findAll(query);
  }

  @Post()
  @ResponseMessage('Ghi danh học sinh thành công')
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(dto);
  }

  @Post('bulk')
  @ResponseMessage('Ghi danh học sinh hàng loạt thành công')
  createBulk(@Body() dto: BulkEnrollmentDto) {
    return this.enrollmentsService.createBulk(dto);
  }

  @Delete(':id')
  @ResponseMessage('Hủy ghi danh thành công')
  remove(@Param('id') id: number) {
    return this.enrollmentsService.remove(+id);
  }
}
