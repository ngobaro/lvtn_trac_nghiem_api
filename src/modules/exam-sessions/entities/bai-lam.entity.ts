import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { TrangThaiBaiLam } from '../../../common/enums/trang-thai-bai-lam.enum';
import { PhongThi } from '../../exam-rooms/entities/phong-thi.entity';
import { BaiThi } from '../../exams/entities/bai-thi.entity';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';
import { CauHoiBaiLam } from './cau-hoi-bai-lam.entity';

// Mỗi học sinh chỉ có 1 bài làm trong 1 phòng
@Entity('BAI_LAM')
@Unique('uq_bailam_phong_nguoidung', ['maPhongThi', 'maNguoiDung'])
export class BaiLam {
  @PrimaryGeneratedColumn()
  maBaiLam: number;

  @Column()
  maPhongThi: number;

  @Column()
  maBaiThi: number;

  @Column()
  maNguoiDung: number;

  @Column({ type: 'datetime' })
  thoiGianBatDau: Date;

  @Column({ type: 'datetime' })
  thoiGianKetThuc: Date;

  @Column({
    type: 'enum',
    enum: TrangThaiBaiLam,
    default: TrangThaiBaiLam.DANG_LAM,
  })
  trangThai: TrangThaiBaiLam;

  // Dữ liệu lịch sử: chặn xóa cứng phòng thi khi còn bài làm (phòng là Tier 1 xóa mềm).
  @ManyToOne(() => PhongThi, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'maPhongThi' })
  phongThi: PhongThi;

  // Chốt ở DB: không xóa đề thi khi đã có bài làm.
  @ManyToOne(() => BaiThi, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'maBaiThi' })
  baiThi: BaiThi;

  // Chặn xóa cứng học sinh khi còn bài làm (chống mồ côi); cột NOT NULL nên dùng RESTRICT.
  @ManyToOne(() => NguoiDung, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'maNguoiDung' })
  nguoiDung: NguoiDung;

  @OneToMany(() => CauHoiBaiLam, (chbl) => chbl.baiLam, { cascade: true })
  cauHoiBaiLams: CauHoiBaiLam[];
}
