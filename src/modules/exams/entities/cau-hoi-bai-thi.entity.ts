import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaiThi } from './bai-thi.entity';
import { CauHoi } from '../../questions/entities/cau-hoi.entity';

@Entity('CAU_HOI_BAI_THI')
export class CauHoiBaiThi {
  @PrimaryGeneratedColumn()
  maCauHoiBaiThi: number;

  @Column()
  maBaiThi: number;

  @Column()
  maCauHoi: number;

  @Column({ type: 'int' })
  thuTu: number;

  @ManyToOne(() => BaiThi, (bt) => bt.cauHoiBaiThis, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maBaiThi' })
  baiThi: BaiThi;

  @ManyToOne(() => CauHoi)
  @JoinColumn({ name: 'maCauHoi' })
  cauHoi: CauHoi;
}
