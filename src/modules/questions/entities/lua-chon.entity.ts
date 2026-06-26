import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CauHoi } from './cau-hoi.entity';

@Entity('LUA_CHON')
export class LuaChon {
  @PrimaryGeneratedColumn()
  maLuaChon: number;

  @Column()
  maCauHoi: number;

  @Column({ type: 'text' })
  noiDung: string;

  // Không phải cột DB: gắn lúc đọc chi tiết để biết lựa chọn này có phải đáp án đúng.
  // Lấy từ bảng DAP_AN (xem QuestionsService.findOne).
  laDapAnDung?: boolean;

  @ManyToOne(() => CauHoi, (ch) => ch.luaChons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maCauHoi' })
  cauHoi: CauHoi;
}