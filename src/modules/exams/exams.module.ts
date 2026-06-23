import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { BaiThi } from './entities/bai-thi.entity';
import { CauHoiBaiThi } from './entities/cau-hoi-bai-thi.entity';
import { CauHoi } from '../questions/entities/cau-hoi.entity';
import { PhongThi } from '../exam-rooms/entities/phong-thi.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BaiThi, CauHoiBaiThi, CauHoi, PhongThi])],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
