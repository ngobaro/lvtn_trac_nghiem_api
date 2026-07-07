import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ExcelParserService } from './services/excel-parser.service';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';
import { NhaCungCapXacThuc } from '../auth/entities/nha-cung-cap-xac-thuc.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NguoiDung, NhaCungCapXacThuc])],
  controllers: [UsersController],
  providers: [UsersService, ExcelParserService],
  exports: [UsersService],
})
export class UsersModule {}
