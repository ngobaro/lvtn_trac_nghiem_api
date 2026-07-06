import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectOfferingsService } from './subject-offerings.service';
import { SubjectOfferingsController } from './subject-offerings.controller';
import { MonHocHocKy } from './entities/mon-hoc-hoc-ky.entity';
import { PhanCongGiangDay } from '../teaching-assignments/entities/phan-cong-giang-day.entity';
import { GhiDanh } from '../enrollments/entities/ghi-danh.entity';
import { MonHoc } from '../subjects/entities/mon-hoc.entity';
import { HocKy } from '../semesters/entities/hoc-ky.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonHocHocKy,
      PhanCongGiangDay,
      GhiDanh,
      MonHoc,
      HocKy,
    ]),
  ],
  controllers: [SubjectOfferingsController],
  providers: [SubjectOfferingsService],
})
export class SubjectOfferingsModule {}
