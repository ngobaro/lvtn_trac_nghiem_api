import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaiLam } from './bai-lam.entity';
import { CauHoi } from '../../questions/entities/cau-hoi.entity';

@Entity('CAU_HOI_BAI_LAM')
export class CauHoiBaiLam {
  @PrimaryGeneratedColumn()
  maCauHoiBaiLam: number;

  @Column()
  maBaiLam: number;

  @Column()
  maCauHoi: number;

  @Column({ type: 'int' })
  thuTuHienThi: number;

  @ManyToOne(() => BaiLam, (bl) => bl.cauHoiBaiLams, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maBaiLam' })
  baiLam: BaiLam;

  @ManyToOne(() => CauHoi)
  @JoinColumn({ name: 'maCauHoi' })
  cauHoi: CauHoi;
}
