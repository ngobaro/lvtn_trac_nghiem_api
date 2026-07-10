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

// Đăng ký môn: học sinh tự đăng ký 1 môn-học-kỳ (đang mở, học kỳ chưa kết thúc).
// Admin căn cứ danh sách này để gán học sinh vào phòng thi.
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
