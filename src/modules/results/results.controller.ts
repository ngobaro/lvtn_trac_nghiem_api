import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ResultsService } from './results.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { QueryResultDto } from './dto/query-result.dto';
import { QueryResultStatsDto } from './dto/query-result-stats.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('results')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  @Get('me')
  @Roles(VaiTro.HOC_SINH)
  @ResponseMessage('Lấy lịch sử thi thành công')
  getMyResults(@Query() query: PaginationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.resultsService.getMyResults(
      user.maNguoiDung,
      query.page,
      query.limit,
    );
  }

  @Get('stats')
  @Roles(VaiTro.GIAO_VIEN, VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy thống kê kết quả thành công')
  getStats(@Query() query: QueryResultStatsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.resultsService.getStats(query, user);
  }

  @Get()
  @Roles(VaiTro.GIAO_VIEN, VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy danh sách kết quả thành công')
  getResults(@Query() query: QueryResultDto, @CurrentUser() user: CurrentUserPayload) {
    return this.resultsService.getResults(query, user);
  }

  @Get(':id')
  @Roles(VaiTro.HOC_SINH, VaiTro.GIAO_VIEN, VaiTro.QUAN_TRI_VIEN)
  @ResponseMessage('Lấy chi tiết kết quả thành công')
  getResultDetail(@Param('id') id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.resultsService.getResultDetail(+id, user);
  }
}
