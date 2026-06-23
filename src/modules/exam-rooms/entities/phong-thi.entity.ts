import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';
import { BaiThi } from '../../exams/entities/bai-thi.entity';
import { CheDoCauHoi } from '../../../common/enums/che-do-cau-hoi.enum';
import { TrangThaiPhongThi } from '../../../common/enums/trang-thai-phong-thi.enum';
import { ThanhVienPhong } from './thanh-vien-phong.entity';

@Entity('PHONG_THI')
export class PhongThi {
  @PrimaryGeneratedColumn()
  maPhongThi: number;

  @Column()
  maBaiThi: number;

  @Column()
  taoBoi: number;

  @Column({ length: 10, unique: true })
  maThamGiaPhong: string;

  @Column({ type: 'enum', enum: CheDoCauHoi })
  cheDoCauHoi: CheDoCauHoi;

  @Column({ type: 'int', nullable: true })
  soCauChon: number;

  @Column({ type: 'datetime' })
  moLuc: Date;

  @Column({ type: 'datetime' })
  dongLuc: Date;

  @Column({ type: 'int', nullable: true })
  soNguoiThamGia: number;

  @Column({
    type: 'enum',
    enum: TrangThaiPhongThi,
    default: TrangThaiPhongThi.DANG_CHO,
  })
  trangThai: TrangThaiPhongThi;

  @ManyToOne(() => BaiThi)
  @JoinColumn({ name: 'maBaiThi' })
  baiThi: BaiThi;

  @ManyToOne(() => NguoiDung)
  @JoinColumn({ name: 'taoBoi' })
  nguoiTao: NguoiDung;

  @OneToMany(() => ThanhVienPhong, (tv) => tv.phongThi)
  thanhViens: ThanhVienPhong[];
}
