import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ImportUsersDto } from './dto/import-users.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VaiTro } from '../../common/enums/vai-tro.enum';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ParseIntPipe } from '../../common/pipes/parse-int.pipe';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(VaiTro.QUAN_TRI_VIEN)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ResponseMessage('Lấy danh sách người dùng thành công')
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Lấy thông tin người dùng thành công')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ResponseMessage('Tạo người dùng thành công')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // Tải lên file Excel (.xlsx) -> đọc danh sách + đánh dấu dòng lỗi (KHÔNG lưu DB).
  @Post('import/preview')
  @ResponseMessage('Đọc file thành công')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const ten = (file.originalname || '').toLowerCase();
        const hopLe =
          ten.endsWith('.xlsx') ||
          file.mimetype ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (!hopLe) {
          return cb(
            new BadRequestException('Chỉ chấp nhận file Excel (.xlsx)'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  previewImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn file để tải lên');
    return this.usersService.xemTruocImport(file);
  }

  // Tạo hàng loạt từ danh sách đã xem trước; bỏ qua dòng lỗi, báo cáo kết quả.
  @Post('import')
  @ResponseMessage('Import tài khoản thành công')
  importUsers(@Body() dto: ImportUsersDto) {
    return this.usersService.importNhieu(dto);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật người dùng thành công')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/status')
  @ResponseMessage('Cập nhật trạng thái người dùng thành công')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, dto.laHoatDong);
  }

  @Delete(':id')
  @ResponseMessage('Xóa người dùng thành công')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
