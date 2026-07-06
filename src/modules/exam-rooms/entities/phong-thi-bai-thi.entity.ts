import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { PhongThi } from './phong-thi.entity';
import { BaiThi } from '../../exams/entities/bai-thi.entity';

// Bảng nối phòng thi ↔ đề thi (M-N): 1 phòng chứa nhiều đề (của nhiều GV
// cùng dạy môn-học-kỳ). Khi học sinh vào thi sẽ bốc ngẫu nhiên 1 đề.
@Entity('PHONG_THI_BAI_THI')
@Unique('uq_ptbt_phong_de', ['maPhongThi', 'maBaiThi'])
export class PhongThiBaiThi {
  @PrimaryGeneratedColumn()
  maPhongThiBaiThi: number;

  @Column()
  maPhongThi: number;

  @Column()
  maBaiThi: number;

  @ManyToOne(() => PhongThi, (pt) => pt.phongThiBaiThis, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maPhongThi' })
  phongThi: PhongThi;

  @ManyToOne(() => BaiThi)
  @JoinColumn({ name: 'maBaiThi' })
  baiThi: BaiThi;
}
