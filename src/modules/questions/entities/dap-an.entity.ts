import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LuaChon } from './lua-chon.entity';

@Entity('DAP_AN')
export class DapAn {
  @PrimaryColumn()
  maLuaChon: number;

  @ManyToOne(() => LuaChon, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maLuaChon' })
  luaChon: LuaChon;
}