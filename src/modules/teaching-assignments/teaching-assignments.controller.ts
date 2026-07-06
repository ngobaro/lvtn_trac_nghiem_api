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
import { TeachingAssignmentsService } from './teaching-assignments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CreateTeachingAssignmentDto } from './dto/create-teaching-assignment.dto';
import { QueryTeachingAssignmentDto } from './dto/query-teaching-assignment.dto';

@Controller('teaching-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(VaiTro.QUAN_TRI_VIEN)
export class TeachingAssignmentsController {
  constructor(
    private readonly teachingAssignmentsService: TeachingAssignmentsService,
  ) {}

  @Get()
  @ResponseMessage('Lấy danh sách phân công thành công')
  findAll(@Query() query: QueryTeachingAssignmentDto) {
    return this.teachingAssignmentsService.findAll(query);
  }

  @Post()
  @ResponseMessage('Phân công giảng dạy thành công')
  create(@Body() dto: CreateTeachingAssignmentDto) {
    return this.teachingAssignmentsService.create(dto);
  }

  @Delete(':id')
  @ResponseMessage('Hủy phân công thành công')
  remove(@Param('id') id: number) {
    return this.teachingAssignmentsService.remove(+id);
  }
}
