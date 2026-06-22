import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { NhaCungCap } from '../../../common/enums/nha-cung-cap.enum';
import { NguoiDung } from './nguoi-dung.entity';

@Entity('NHA_CUNG_CAP_XAC_THUC')
export class NhaCungCapXacThuc {
  @PrimaryGeneratedColumn() 
  maXacThuc: number;

  @Column() 
  maNguoiDung: number;

  @Column({ type: 'enum', enum: NhaCungCap }) 
  nhaCungCap: NhaCungCap;

  @Column({ nullable: true, unique: true }) 
  maNguoiDungNhaCungCap: string;

  @Column({ nullable: true }) 
  matKhau: string;

  @ManyToOne(() => NguoiDung, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maNguoiDung' })
  nguoiDung: NguoiDung;
}
