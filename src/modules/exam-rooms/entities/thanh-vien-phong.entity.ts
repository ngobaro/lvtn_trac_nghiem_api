import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';
import { TrangThaiThanhVien } from '../../../common/enums/trang-thai-thanh-vien.enum';
import { PhongThi } from './phong-thi.entity';

// Mỗi học sinh chỉ là thành viên 1 lần trong 1 phòng
@Entity('THANH_VIEN_PHONG')
@Unique('uq_tvp_phong_nguoidung', ['maPhongThi', 'maNguoiDung'])
export class ThanhVienPhong {
  @PrimaryGeneratedColumn()
  maThanhVien: number;

  @Column()
  maPhongThi: number;

  @Column()
  maNguoiDung: number;

  @Column({
    type: 'enum',
    enum: TrangThaiThanhVien,
    default: TrangThaiThanhVien.DA_THAM_GIA,
  })
  trangThai: TrangThaiThanhVien;

  @ManyToOne(() => PhongThi, (pt) => pt.thanhViens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maPhongThi' })
  phongThi: PhongThi;

  @ManyToOne(() => NguoiDung)
  @JoinColumn({ name: 'maNguoiDung' })
  nguoiDung: NguoiDung;
}
