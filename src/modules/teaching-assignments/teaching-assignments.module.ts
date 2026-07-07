import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeachingAssignmentsService } from './teaching-assignments.service';
import { TeachingAssignmentsController } from './teaching-assignments.controller';
import { PhanCongGiangDay } from './entities/phan-cong-giang-day.entity';
import { MonHocHocKy } from '../subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';
import { BaiThi } from '../exams/entities/bai-thi.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PhanCongGiangDay,
      MonHocHocKy,
      NguoiDung,
      BaiThi,
    ]),
  ],
  controllers: [TeachingAssignmentsController],
  providers: [TeachingAssignmentsService],
})
export class TeachingAssignmentsModule {}
