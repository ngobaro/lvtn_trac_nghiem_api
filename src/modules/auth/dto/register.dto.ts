import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import { VaiTro } from '../../../common/enums/vai-tro.enum';

export class RegisterDto {
  @IsNotEmpty() tenNguoiDung: string;
  @IsEmail() email: string;
  @MinLength(6) matKhau: string;
  @IsEnum(VaiTro) vaiTro: VaiTro;
}
