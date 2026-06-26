import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';
import { MonHoc } from '../../subjects/entities/mon-hoc.entity';
import { TrangThaiBaiThi } from '../../../common/enums/trang-thai-bai-thi.enum';
import { CauHoiBaiThi } from './cau-hoi-bai-thi.entity';

@Entity('BAI_THI')
export class BaiThi {
  @PrimaryGeneratedColumn()
  maBaiThi: number;

  @Column()
  taoBoi: number;

  @Column()
  maMonHoc: number;

  @Column({ length: 100 })
  tieuDe: string;

  @Column({ type: 'int' })
  thoiGianLamBai: number;

  @Column({
    type: 'enum',
    enum: TrangThaiBaiThi,
    default: TrangThaiBaiThi.NHAP,
  })
  trangThai: TrangThaiBaiThi;

  @ManyToOne(() => NguoiDung)
  @JoinColumn({ name: 'taoBoi' })
  nguoiTao: NguoiDung;

  @ManyToOne(() => MonHoc)
  @JoinColumn({ name: 'maMonHoc' })
  monHoc: MonHoc;

  @OneToMany(() => CauHoiBaiThi, (chbt) => chbt.baiThi, { cascade: true })
  cauHoiBaiThis: CauHoiBaiThi[];

  // Cờ runtime (không map cột): đề đã được dùng (có phòng thi hoặc đã có bài làm)
  // => khóa thay đổi danh sách câu hỏi. Được gán ở findOne.
  daSuDung?: boolean;
}
