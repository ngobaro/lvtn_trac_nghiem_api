import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

// Không thể có 2 học kỳ trùng tên học kỳ và năm học (VD: "Học kỳ 1" · "2025-2026").
@Entity('HOC_KY')
@Unique('uq_hoc_ky_ten_nam', ['tenHocKy', 'namHoc'])
export class HocKy {
  @PrimaryGeneratedColumn()
  maHocKy: number;

  // Tên học kỳ, ví dụ "Học kỳ 1".
  @Column({ length: 100 })
  tenHocKy: string;

  // Năm học, ví dụ "2025-2026".
  @Column({ length: 20 })
  namHoc: string;

  @Column({ type: 'date' })
  ngayBatDau: Date;

  @Column({ type: 'date' })
  ngayKetThuc: Date;
}
