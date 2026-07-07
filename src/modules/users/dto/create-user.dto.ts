import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VaiTro } from '../../../common/enums/vai-tro.enum';

export class CreateUserDto {
  @IsNotEmpty()
  @MaxLength(100, { message: 'Tên người dùng không được vượt quá 100 ký tự' })
  tenNguoiDung: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsIn([VaiTro.HOC_SINH, VaiTro.GIAO_VIEN], {
    message: 'Vai trò không hợp lệ',
  })
  vaiTro: VaiTro;

  // Mật khẩu khởi tạo. Nếu bỏ trống sẽ dùng mật khẩu mặc định.
  @IsOptional()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  matKhau?: string;
}
