import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SemestersService } from './semesters.service';
import { SemestersController } from './semesters.controller';
import { HocKy } from './entities/hoc-ky.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HocKy])],
  controllers: [SemestersController],
  providers: [SemestersService],
})
export class SemestersModule {}
