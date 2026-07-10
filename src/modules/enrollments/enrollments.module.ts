import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { GhiDanh } from './entities/ghi-danh.entity';
import { MonHocHocKy } from '../subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { BaiLam } from '../exam-sessions/entities/bai-lam.entity';
import { PhongThiHocSinh } from '../exam-rooms/entities/phong-thi-hoc-sinh.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GhiDanh, MonHocHocKy, BaiLam, PhongThiHocSinh]),
  ],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
})
export class EnrollmentsModule {}
