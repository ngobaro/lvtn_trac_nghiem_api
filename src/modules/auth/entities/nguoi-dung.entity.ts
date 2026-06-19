import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { VaiTro } from '../../../common/enums/vai-tro.enum';

@Entity('NGUOI_DUNG')
export class NguoiDung {
    @PrimaryGeneratedColumn() maNguoiDung: number;
    @Column({ length: 100 }) tenNguoiDung: string;
    @Column({ length: 255, unique: true }) email: string;
    @Column({ type: 'enum', enum: VaiTro }) vaiTro: VaiTro;
    @Column({ default: true }) laHoatDong: boolean;
}
