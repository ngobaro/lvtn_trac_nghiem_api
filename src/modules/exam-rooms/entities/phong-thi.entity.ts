import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';
import { MonHocHocKy } from '../../subject-offerings/entities/mon-hoc-hoc-ky.entity';
import { CheDoCauHoi } from '../../../common/enums/che-do-cau-hoi.enum';
import { TrangThaiPhongThi } from '../../../common/enums/trang-thai-phong-thi.enum';
import { ThanhVienPhong } from './thanh-vien-phong.entity';
import { PhongThiBaiThi } from './phong-thi-bai-thi.entity';

@Entity('PHONG_THI')
export class PhongThi {
  @PrimaryGeneratedColumn()
  maPhongThi: number;

  // Phòng thuộc 1 môn-học-kỳ; học sinh đã ghi danh môn-kỳ này mới được vào thi.
  @Column()
  maMonHocHocKy: number;

  // Người tạo phòng = Admin.
  @Column()
  taoBoi: number;

  @Column({ length: 150 })
  tenPhongThi: string;

  @Column({ type: 'enum', enum: CheDoCauHoi })
  cheDoCauHoi: CheDoCauHoi;

  // Thời lượng làm bài (phút) ở cấp phòng — dùng chung cho mọi đề trong phòng.
  @Column({ type: 'int' })
  thoiGianLamBai: number;

  @Column({ type: 'datetime' })
  moLuc: Date;

  @Column({ type: 'datetime' })
  dongLuc: Date;

  @Column({ type: 'int', nullable: true })
  soNguoiThamGia: number;

  // Xóa mềm.
  @Column({ default: true })
  laHoatDong: boolean;

  @Column({
    type: 'enum',
    enum: TrangThaiPhongThi,
    default: TrangThaiPhongThi.DANG_CHO,
  })
  trangThai: TrangThaiPhongThi;

  @ManyToOne(() => MonHocHocKy)
  @JoinColumn({ name: 'maMonHocHocKy' })
  monHocHocKy: MonHocHocKy;

  @ManyToOne(() => NguoiDung)
  @JoinColumn({ name: 'taoBoi' })
  nguoiTao: NguoiDung;

  @OneToMany(() => ThanhVienPhong, (tv) => tv.phongThi)
  thanhViens: ThanhVienPhong[];

  @OneToMany(() => PhongThiBaiThi, (ptbt) => ptbt.phongThi, { cascade: true })
  phongThiBaiThis: PhongThiBaiThi[];
}
