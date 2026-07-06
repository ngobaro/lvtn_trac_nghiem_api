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
import { SemestersService } from './semesters.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { QuerySemesterDto } from './dto/query-semester.dto';

@Controller('semesters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SemestersController {
  constructor(private readonly semestersService: SemestersService) {}

  // GET mở cho mọi vai trò đã đăng nhập (dùng cho dropdown chọn học kỳ).
  @Get()
  @Roles(VaiTro.HOC_SINH, VaiTro.GIAO_VIEN, VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy danh sách học kỳ thành công')
  findAll(@Query() query: QuerySemesterDto) {
    return this.semestersService.findAll(query);
  }

  @Get(':id')
  @Roles(VaiTro.HOC_SINH, VaiTro.GIAO_VIEN, VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy thông tin học kỳ thành công')
  findOne(@Param('id') id: number) {
    return this.semestersService.findOne(+id);
  }

  @Post()
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Tạo học kỳ thành công')
  create(@Body() dto: CreateSemesterDto) {
    return this.semestersService.create(dto);
  }

  @Patch(':id')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Cập nhật học kỳ thành công')
  update(@Param('id') id: number, @Body() dto: UpdateSemesterDto) {
    return this.semestersService.update(+id, dto);
  }

  @Patch(':id/status')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Cập nhật trạng thái học kỳ thành công')
  updateStatus(
    @Param('id') id: number,
    @Body('laHoatDong') laHoatDong: boolean,
  ) {
    return this.semestersService.updateStatus(+id, laHoatDong);
  }

  @Delete(':id')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Xóa học kỳ thành công')
  remove(@Param('id') id: number) {
    return this.semestersService.remove(+id);
  }
}
