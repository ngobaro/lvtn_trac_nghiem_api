import { Controller, Get, Param, Patch, Delete, Query, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ParseIntPipe } from '../../common/pipes/parse-int.pipe';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(VaiTro.QUAN_TRI_VIEN)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get() findAll(@Query() query: QueryUserDto) { return this.usersService.findAll(query); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.usersService.findOne(id); }
  @Patch(':id/status') updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, dto.laHoatDong);
  }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.usersService.remove(id); }
}
