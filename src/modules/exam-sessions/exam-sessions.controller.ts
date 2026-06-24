import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ExamSessionsService } from './exam-sessions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JoinRoomDto } from './dto/join-room.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Controller('exam-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(VaiTro.HOC_SINH)
export class ExamSessionsController {
  constructor(private examSessionsService: ExamSessionsService) {}

  @Post('join')
  @ResponseMessage('Tham gia phòng thi thành công')
  join(@Body() dto: JoinRoomDto, @CurrentUser() user: CurrentUserPayload) {
    return this.examSessionsService.joinRoom(dto, user.maNguoiDung);
  }

  @Get(':id')
  @ResponseMessage('Lấy thông tin phiên thi thành công')
  getSession(@Param('id') id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.examSessionsService.getSession(+id, user.maNguoiDung);
  }

  @Get(':id/questions/:order')
  @ResponseMessage('Lấy câu hỏi thành công')
  getQuestion(
    @Param('id') id: number,
    @Param('order') order: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.examSessionsService.getQuestion(+id, +order, user.maNguoiDung);
  }

  @Post(':id/answers')
  @ResponseMessage('Lưu câu trả lời thành công')
  saveAnswer(
    @Param('id') id: number,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.examSessionsService.saveAnswer(+id, dto, user.maNguoiDung);
  }

  @Post(':id/submit')
  @ResponseMessage('Nộp bài thành công')
  submit(@Param('id') id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.examSessionsService.submit(+id, user.maNguoiDung);
  }
}
