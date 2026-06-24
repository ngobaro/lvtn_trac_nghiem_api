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

  @ManyToOne(() => PhongThi)
  @JoinColumn({ name: 'maPhongThi' })
  phongThi: PhongThi;

  @ManyToOne(() => BaiThi)
  @JoinColumn({ name: 'maBaiThi' })
  baiThi: BaiThi;

  @OneToMany(() => CauHoiBaiLam, (chbl) => chbl.baiLam, { cascade: true })
  cauHoiBaiLams: CauHoiBaiLam[];
}
