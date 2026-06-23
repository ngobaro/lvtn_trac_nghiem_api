import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamRoomsController } from './exam-rooms.controller';
import { ExamRoomsService } from './exam-rooms.service';
import { PhongThi } from './entities/phong-thi.entity';
import { ThanhVienPhong } from './entities/thanh-vien-phong.entity';
import { BaiThi } from '../exams/entities/bai-thi.entity';
import { CauHoiBaiThi } from '../exams/entities/cau-hoi-bai-thi.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PhongThi, ThanhVienPhong, BaiThi, CauHoiBaiThi]),
  ],
  controllers: [ExamRoomsController],
  providers: [ExamRoomsService],
})
export class ExamRoomsModule {}
