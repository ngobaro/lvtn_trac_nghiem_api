import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';
import { MonHoc } from '../../subjects/entities/mon-hoc.entity';
import { DoKho } from '../../../common/enums/do-kho.enum';
import { LoaiCauHoi } from '../../../common/enums/loai-cau-hoi.enum';
import { LuaChon } from './lua-chon.entity';

@Entity('CAU_HOI')
export class CauHoi {
  @PrimaryGeneratedColumn()
  maCauHoi: number;

  @Column()
  taoBoi: number;

  @Column()
  maMonHoc: number;

  @Column({ type: 'text' })
  noiDung: string;

  @Column({ nullable: true, length: 255 })
  hinhAnh: string;

  @Column({ type: 'enum', enum: DoKho })
  doKho: DoKho;

  @Column({ type: 'enum', enum: LoaiCauHoi })
  loaiCauHoi: LoaiCauHoi;

  @ManyToOne(() => NguoiDung)
  @JoinColumn({ name: 'taoBoi' })
  nguoiTao: NguoiDung;

  @ManyToOne(() => MonHoc)
  @JoinColumn({ name: 'maMonHoc' })
  monHoc: MonHoc;

  @OneToMany(() => LuaChon, (lc) => lc.cauHoi, { cascade: true })
  luaChons: LuaChon[];
}