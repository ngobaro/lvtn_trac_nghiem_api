import { IsBoolean, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { VaiTro } from '../../../common/enums/vai-tro.enum';

export class UpdateUserDto {
  @IsOptional()
  @MaxLength(100, { message: 'Tên người dùng không được vượt quá 100 ký tự' })
  tenNguoiDung?: string;

  @IsOptional()
  @IsEnum(VaiTro, { message: 'Vai trò không hợp lệ' })
  vaiTro?: VaiTro;

  @IsOptional()
  @IsBoolean()
  laHoatDong?: boolean;
}
