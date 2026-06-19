import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NguoiDung])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
