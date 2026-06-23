import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('NGUOI_DUNG_TRA_LOI')
export class NguoiDungTraLoi {
  @PrimaryGeneratedColumn()
  maTraLoi: number;

  @Column()
  maBaiLam: number;

  @Column()
  maCauHoi: number;

  @Column({ type: 'int', nullable: true })
  maLuaChon: number | null;
}
