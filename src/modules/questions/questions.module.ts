import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { CauHoi } from './entities/cau-hoi.entity';
import { LuaChon } from './entities/lua-chon.entity';
import { DapAn } from './entities/dap-an.entity';
import { AppwriteService } from '../../common/services/appwrite.service';

@Module({
  imports: [TypeOrmModule.forFeature([CauHoi, LuaChon, DapAn])],
  controllers: [QuestionsController],
  providers: [QuestionsService, AppwriteService],
})
export class QuestionsModule {}