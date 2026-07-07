import { IsBoolean, IsIn, IsOptional, MaxLength } from 'class-validator';
import { VaiTro } from '../../../common/enums/vai-tro.enum';

export class UpdateUserDto {
  @IsOptional()
  @MaxLength(100, { message: 'Tên người dùng không được vượt quá 100 ký tự' })
  tenNguoiDung?: string;

  @IsOptional()
  @IsIn([VaiTro.HOC_SINH, VaiTro.GIAO_VIEN], {
    message: 'Vai trò không hợp lệ',
  })
  vaiTro?: VaiTro;

  @IsOptional()
  @IsBoolean()
  laHoatDong?: boolean;
}
