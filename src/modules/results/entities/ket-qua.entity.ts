import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaiLam } from '../../exam-sessions/entities/bai-lam.entity';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';
import { BaiThi } from '../../exams/entities/bai-thi.entity';

@Entity('KET_QUA')
export class KetQua {
  @PrimaryGeneratedColumn()
  maKetQua: number;

  @Column()
  maBaiLam: number;

  @Column()
  maNguoiDung: number;

  @Column()
  maBaiThi: number;

  @Column({ type: 'float' })
  diemSo: number;

  @Column({ type: 'int' })
  tongSoCau: number;

  @Column({ type: 'int' })
  soCauDung: number;

  // Kết quả là dữ liệu dẫn xuất 1-1 của bài làm: bài làm bị xóa thì kết quả đi theo.
  @ManyToOne(() => BaiLam, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maBaiLam' })
  baiLam: BaiLam;

  // Dữ liệu lịch sử: chặn xóa cứng học sinh khi còn kết quả.
  @ManyToOne(() => NguoiDung, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'maNguoiDung' })
  nguoiDung: NguoiDung;

  // Chốt ở DB: không xóa đề thi khi đã có kết quả.
  @ManyToOne(() => BaiThi, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'maBaiThi' })
  baiThi: BaiThi;
}
