import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { KetQua } from './entities/ket-qua.entity';
import { BaiThi } from '../exams/entities/bai-thi.entity';
import { BaiLam } from '../exam-sessions/entities/bai-lam.entity';
import { CauHoiBaiLam } from '../exam-sessions/entities/cau-hoi-bai-lam.entity';
import { NguoiDungTraLoi } from '../exam-sessions/entities/nguoi-dung-tra-loi.entity';
import { LuaChon } from '../questions/entities/lua-chon.entity';
import { DapAn } from '../questions/entities/dap-an.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KetQua,
      BaiThi,
      BaiLam,
      CauHoiBaiLam,
      NguoiDungTraLoi,
      LuaChon,
      DapAn,
    ]),
  ],
  controllers: [ResultsController],
  providers: [ResultsService],
})
export class ResultsModule {}
