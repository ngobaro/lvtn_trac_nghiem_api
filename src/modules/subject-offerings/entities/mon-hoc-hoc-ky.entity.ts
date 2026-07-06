import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MonHoc } from '../../subjects/entities/mon-hoc.entity';
import { HocKy } from '../../semesters/entities/hoc-ky.entity';

// "Môn học của học kỳ" — 1 môn học được mở trong 1 học kỳ cụ thể.
// Đây là hub nối giáo viên (phân công) và học sinh (ghi danh).
@Entity('MON_HOC_HOC_KY')
@Unique('uq_mhhk_mon_ky', ['maMonHoc', 'maHocKy'])
export class MonHocHocKy {
  @PrimaryGeneratedColumn()
  maMonHocHocKy: number;

  @Column()
  maMonHoc: number;

  @Column()
  maHocKy: number;

  @Column({ default: true })
  laHoatDong: boolean;

  @ManyToOne(() => MonHoc)
  @JoinColumn({ name: 'maMonHoc' })
  monHoc: MonHoc;

  @ManyToOne(() => HocKy)
  @JoinColumn({ name: 'maHocKy' })
  hocKy: HocKy;
}
