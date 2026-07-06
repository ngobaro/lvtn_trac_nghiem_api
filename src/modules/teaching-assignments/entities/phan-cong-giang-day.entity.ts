import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MonHocHocKy } from '../../subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';

// Phân công giảng dạy: Admin phân 1 giáo viên dạy 1 môn-học-kỳ.
// Một môn-học-kỳ có thể có nhiều GV; một GV dạy nhiều môn-học-kỳ.
@Entity('PHAN_CONG_GIANG_DAY')
@Unique('uq_pcgd_monky_gv', ['maMonHocHocKy', 'maGiaoVien'])
export class PhanCongGiangDay {
  @PrimaryGeneratedColumn()
  maPhanCong: number;

  @Column()
  maMonHocHocKy: number;

  @Column()
  maGiaoVien: number;

  @ManyToOne(() => MonHocHocKy)
  @JoinColumn({ name: 'maMonHocHocKy' })
  monHocHocKy: MonHocHocKy;

  @ManyToOne(() => NguoiDung)
  @JoinColumn({ name: 'maGiaoVien' })
  giaoVien: NguoiDung;
}
