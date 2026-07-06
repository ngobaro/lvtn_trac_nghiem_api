import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamRoomsController } from './exam-rooms.controller';
import { ExamRoomsService } from './exam-rooms.service';
import { PhongThi } from './entities/phong-thi.entity';
import { PhongThiBaiThi } from './entities/phong-thi-bai-thi.entity';
import { ThanhVienPhong } from './entities/thanh-vien-phong.entity';
import { BaiThi } from '../exams/entities/bai-thi.entity';
import { CauHoiBaiThi } from '../exams/entities/cau-hoi-bai-thi.entity';
import { GhiDanh } from '../enrollments/entities/ghi-danh.entity';
import { MonHocHocKy } from '../subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { ExamSessionsModule } from '../exam-sessions/exam-sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PhongThi,
      PhongThiBaiThi,
      ThanhVienPhong,
      BaiThi,
      CauHoiBaiThi,
      GhiDanh,
      MonHocHocKy,
    ]),
    ExamSessionsModule,
  ],
  controllers: [ExamRoomsController],
  providers: [ExamRoomsService],
})
export class ExamRoomsModule {}
