import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaiLam } from './bai-lam.entity';
import { CauHoi } from '../../questions/entities/cau-hoi.entity';
import { LuaChon } from '../../questions/entities/lua-chon.entity';

@Entity('NGUOI_DUNG_TRA_LOI')
export class NguoiDungTraLoi {
  @PrimaryGeneratedColumn()
  maTraLoi: number;

  @Column()
  maBaiLam: number;

  @Column()
  maCauHoi: number;

  @Column({ type: 'int', nullable: true })
  maLuaChon: number | null;

  // Câu trả lời thuộc bài làm: bài làm bị xóa thì câu trả lời đi theo.
  @ManyToOne(() => BaiLam, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maBaiLam' })
  baiLam: BaiLam;

  // Câu hỏi đã vào bài làm vốn bị chặn xóa (kiemTraCauHoiDaThi); RESTRICT chốt ở DB.
  @ManyToOne(() => CauHoi, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'maCauHoi' })
  cauHoi: CauHoi;

  // Cột nullable (ngữ nghĩa "không chọn"): nếu lựa chọn bị xóa, null hóa thay vì mồ côi.
  @ManyToOne(() => LuaChon, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'maLuaChon' })
  luaChon: LuaChon | null;
}
