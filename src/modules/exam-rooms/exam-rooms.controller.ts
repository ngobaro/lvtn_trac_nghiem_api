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
import { ExamRoomsService } from './exam-rooms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CreateExamRoomDto } from './dto/create-exam-room.dto';
import { UpdateExamRoomDto } from './dto/update-exam-room.dto';
import { UpdateExamRoomStatusDto } from './dto/update-exam-room-status.dto';
import { QueryExamRoomDto } from './dto/query-exam-room.dto';
import { QueryAssignedStudentsDto } from './dto/query-assigned-students.dto';
import { JoinByCodeDto } from './dto/join-by-code.dto';

@Controller('exam-rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamRoomsController {
  constructor(private examRoomsService: ExamRoomsService) {}

  // Học sinh: danh sách phòng thi thuộc môn-học-kỳ đã ghi danh.
  @Get('available')
  @Roles(VaiTro.HOC_SINH)
  @ResponseMessage('Lấy danh sách phòng thi thành công')
  layPhongDaGhiDanh(@CurrentUser() user: CurrentUserPayload) {
    return this.examRoomsService.findAllForHocSinh(user.maNguoiDung);
  }

  @Get()
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy danh sách phòng thi thành công')
  findAll(@Query() query: QueryExamRoomDto) {
    return this.examRoomsService.findAll(query);
  }

  // Admin: HS đã được gán vào phòng khác của môn-học-kỳ (để FE ẩn khỏi picker).
  @Get('assigned-students')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy danh sách học sinh đã gán thành công')
  layHsDaGan(@Query() q: QueryAssignedStudentsDto) {
    return this.examRoomsService.layHocSinhDaGan(q.maMonHocHocKy, q.excludePhongThi);
  }

  // Học sinh: nhập mã tham gia để tự vào phòng (thay cho việc Admin gán tay).
  @Post('join-by-code')
  @Roles(VaiTro.HOC_SINH)
  @ResponseMessage('Tham gia phòng thi thành công')
  thamGiaBangMa(
    @Body() dto: JoinByCodeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.examRoomsService.thamGiaBangMa(dto, user.maNguoiDung);
  }

  @Get(':id')
  @Roles(VaiTro.HOC_SINH, VaiTro.GIAO_VIEN, VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy thông tin phòng thi thành công')
  async findOne(
    @Param('id') id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const phong = await this.examRoomsService.findOne(+id);
    // Mã tham gia chỉ Admin được thấy.
    return user.vaiTro === VaiTro.QUAN_TRI_VIEN
      ? phong
      : this.examRoomsService.anMaThamGia(phong);
  }

  @Get(':id/members')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy danh sách thành viên phòng thi thành công')
  getMembers(@Param('id') id: number) {
    return this.examRoomsService.getMembers(+id);
  }

  @Post()
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Tạo phòng thi thành công')
  create(
    @Body() dto: CreateExamRoomDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.examRoomsService.create(dto, user.maNguoiDung);
  }

  @Patch(':id')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Cập nhật phòng thi thành công')
  update(@Param('id') id: number, @Body() dto: UpdateExamRoomDto) {
    return this.examRoomsService.update(+id, dto);
  }

  @Patch(':id/status')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Cập nhật trạng thái phòng thi thành công')
  updateStatus(
    @Param('id') id: number,
    @Body() dto: UpdateExamRoomStatusDto,
  ) {
    return this.examRoomsService.updateStatus(+id, dto.trangThai);
  }

  @Delete(':id')
  @Roles(VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Xóa phòng thi thành công')
  remove(@Param('id') id: number) {
    return this.examRoomsService.remove(+id);
  }
}
