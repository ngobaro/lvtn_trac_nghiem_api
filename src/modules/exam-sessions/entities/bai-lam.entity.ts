import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TrangThaiBaiLam } from '../../../common/enums/trang-thai-bai-lam.enum';
import { PhongThi } from '../../exam-rooms/entities/phong-thi.entity';
import { BaiThi } from '../../exams/entities/bai-thi.entity';
import { CauHoiBaiLam } from './cau-hoi-bai-lam.entity';

@Entity('BAI_LAM')
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
