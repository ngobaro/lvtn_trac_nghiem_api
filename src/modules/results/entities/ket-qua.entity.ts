import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('KET_QUA')
export class KetQua {
  @PrimaryGeneratedColumn()
  maKetQua: number;

  @Column()
  maBaiLam: number;

  @Column()
  maNguoiDung: number;

  @Column()
  maBaiThi: number;

  @Column({ type: 'float' })
  diemSo: number;

  @Column({ type: 'int' })
  tongSoCau: number;

  @Column({ type: 'int' })
  soCauDung: number;
}
