import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { PhongThi } from './phong-thi.entity';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';

// Bảng nối phòng thi ↔ học sinh (M-N): Admin gán HS cụ thể vào từng phòng để
// chia danh sách HS của cùng môn-học-kỳ ra nhiều phòng. HS chỉ thấy & vào được
// phòng mình được gán. Ràng buộc 1 HS chỉ ở 1 phòng của mỗi môn-học-kỳ được
// kiểm tra ở tầng service.
@Entity('PHONG_THI_HOC_SINH')
@Unique('uq_pths_phong_hs', ['maPhongThi', 'maHocSinh'])
export class PhongThiHocSinh {
  @PrimaryGeneratedColumn()
  maPhongThiHocSinh: number;

  @Column()
  maPhongThi: number;

  @Column()
  maHocSinh: number;

  @ManyToOne(() => PhongThi, (pt) => pt.phongThiHocSinhs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'maPhongThi' })
  phongThi: PhongThi;

  @ManyToOne(() => NguoiDung)
  @JoinColumn({ name: 'maHocSinh' })
  hocSinh: NguoiDung;
}
