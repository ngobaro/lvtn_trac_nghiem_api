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

// Ghi danh: Admin ghi danh 1 học sinh vào 1 môn-học-kỳ.
// Học sinh chỉ vào được các phòng thi thuộc môn-học-kỳ mình đã ghi danh.
@Entity('GHI_DANH')
@Unique('uq_ghidanh_monky_hs', ['maMonHocHocKy', 'maHocSinh'])
export class GhiDanh {
  @PrimaryGeneratedColumn()
  maGhiDanh: number;

  @Column()
  maMonHocHocKy: number;

  @Column()
  maHocSinh: number;

  @ManyToOne(() => MonHocHocKy)
  @JoinColumn({ name: 'maMonHocHocKy' })
  monHocHocKy: MonHocHocKy;

  @ManyToOne(() => NguoiDung)
  @JoinColumn({ name: 'maHocSinh' })
  hocSinh: NguoiDung;
}
