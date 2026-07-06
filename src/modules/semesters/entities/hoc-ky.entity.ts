import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('HOC_KY')
export class HocKy {
  @PrimaryGeneratedColumn()
  maHocKy: number;

  // Tên học kỳ, ví dụ "Học kỳ 1".
  @Column({ length: 100 })
  tenHocKy: string;

  // Năm học, ví dụ "2025-2026".
  @Column({ length: 20 })
  namHoc: string;

  @Column({ type: 'date', nullable: true })
  ngayBatDau: Date;

  @Column({ type: 'date', nullable: true })
  ngayKetThuc: Date;

  @Column({ default: true })
  laHoatDong: boolean;
}
