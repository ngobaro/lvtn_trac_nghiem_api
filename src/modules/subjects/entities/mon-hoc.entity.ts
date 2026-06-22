import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';

@Entity('MON_HOC')
export class MonHoc {
  @PrimaryGeneratedColumn()
  maMonHoc: number;

  @Column()
  maNguoiDung: number;

  @Column({ length: 100 })
  tenMonHoc: string;

  @Column({ length: 20, nullable: true })
  maDinhDanhMon: string;

  @Column({ type: 'text', nullable: true })
  moTa: string;

  @Column({ default: true })
  laHoatDong: boolean;

  @ManyToOne(() => NguoiDung)
  @JoinColumn({ name: 'maNguoiDung' })
  nguoiDung: NguoiDung;
}