import { Module } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { MonHoc } from './entities/mon-hoc.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([MonHoc])],
  controllers: [SubjectsController],
  providers: [SubjectsService]
})
export class SubjectsModule {}
