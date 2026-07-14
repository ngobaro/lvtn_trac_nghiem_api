import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Môn học là danh mục chung do Admin quản lý (không còn thuộc sở hữu GV).
@Entity('MON_HOC')
export class MonHoc {
  @PrimaryGeneratedColumn()
  maMonHoc: number;

  @Column({ length: 100 })
  tenMonHoc: string;

  @Column({ type: 'text', nullable: true })
  moTa: string;

  @Column({ default: true })
  laHoatDong: boolean;
}
