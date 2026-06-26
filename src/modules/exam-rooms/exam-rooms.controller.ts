import {
  Body,
  Controller,
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
import { UpdateExamRoomStatusDto } from './dto/update-exam-room-status.dto';
import { QueryExamRoomDto } from './dto/query-exam-room.dto';

@Controller('exam-rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(VaiTro.GIAO_VIEN, VaiTro.QUAN_TRI_VIEN)
export class ExamRoomsController {
  constructor(private examRoomsService: ExamRoomsService) {}

  @Get()
  @ResponseMessage('Lấy danh sách phòng thi thành công')
  findAll(
    @Query() query: QueryExamRoomDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const taoBoi =
      user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
    return this.examRoomsService.findAll(query, taoBoi);
  }

  @Get(':id')
  @ResponseMessage('Lấy thông tin phòng thi thành công')
  findOne(@Param('id') id: number, @CurrentUser() user: CurrentUserPayload) {
    const taoBoi =
      user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
    return this.examRoomsService.findOne(+id, taoBoi);
  }

  @Get(':id/members')
  @ResponseMessage('Lấy danh sách thành viên phòng thi thành công')
  getMembers(@Param('id') id: number, @CurrentUser() user: CurrentUserPayload) {
    const taoBoi =
      user.vaiTro === VaiTro.QUAN_TRI_VIEN ? undefined : user.maNguoiDung;
    return this.examRoomsService.getMembers(+id, taoBoi);
  }

  @Post()
  @Roles(VaiTro.GIAO_VIEN)
  @ResponseMessage('Tạo phòng thi thành công')
  create(
    @Body() dto: CreateExamRoomDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.examRoomsService.create(dto, user.maNguoiDung);
  }

  @Patch(':id/status')
  @Roles(VaiTro.GIAO_VIEN)
  @ResponseMessage('Cập nhật trạng thái phòng thi thành công')
  updateStatus(
    @Param('id') id: number,
    @Body() dto: UpdateExamRoomStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.examRoomsService.updateStatus(
      +id,
      dto.trangThai,
      user.maNguoiDung,
    );
  }
}
