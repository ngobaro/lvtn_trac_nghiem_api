import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CauHoi } from './cau-hoi.entity';

@Entity('LUA_CHON')
export class LuaChon {
  @PrimaryGeneratedColumn()
  maLuaChon: number;

  @Column()
  maCauHoi: number;

  @Column({ type: 'text' })
  noiDung: string;

  @ManyToOne(() => CauHoi, (ch) => ch.luaChons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maCauHoi' })
  cauHoi: CauHoi;
}