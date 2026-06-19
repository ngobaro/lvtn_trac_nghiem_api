import { IsNotEmpty, MinLength } from 'class-validator';
export class ChangePasswordDto {
  @IsNotEmpty() matKhauHienTai: string;
  @MinLength(6) matKhauMoi: string;
  @MinLength(6) xacNhanMatKhau: string;
}
