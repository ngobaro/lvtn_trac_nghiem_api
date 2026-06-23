import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';
import { TrangThaiThanhVien } from '../../../common/enums/trang-thai-thanh-vien.enum';
import { PhongThi } from './phong-thi.entity';

@Entity('THANH_VIEN_PHONG')
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
