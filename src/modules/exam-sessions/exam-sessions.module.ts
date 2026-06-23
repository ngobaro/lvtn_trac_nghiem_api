import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ExamSessionsController } from './exam-sessions.controller';
import { ExamSessionsService } from './exam-sessions.service';
import { ExamSessionsGateway } from './exam-sessions.gateway';
import { BaiLam } from './entities/bai-lam.entity';
import { CauHoiBaiLam } from './entities/cau-hoi-bai-lam.entity';
import { NguoiDungTraLoi } from './entities/nguoi-dung-tra-loi.entity';
import { PhongThi } from '../exam-rooms/entities/phong-thi.entity';
import { ThanhVienPhong } from '../exam-rooms/entities/thanh-vien-phong.entity';
import { CauHoiBaiThi } from '../exams/entities/cau-hoi-bai-thi.entity';
import { CauHoi } from '../questions/entities/cau-hoi.entity';
import { LuaChon } from '../questions/entities/lua-chon.entity';
import { DapAn } from '../questions/entities/dap-an.entity';
import { KetQua } from '../results/entities/ket-qua.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BaiLam,
      CauHoiBaiLam,
      NguoiDungTraLoi,
      PhongThi,
      ThanhVienPhong,
      CauHoiBaiThi,
      CauHoi,
      LuaChon,
      DapAn,
      KetQua,
    ]),
    JwtModule.register({ secret: process.env.JWT_SECRET || 'secret' }),
  ],
  controllers: [ExamSessionsController],
  providers: [ExamSessionsService, ExamSessionsGateway],
})
export class ExamSessionsModule {}
