import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
export class ResetPasswordDto {
  @IsEmail() email: string;
  @IsNotEmpty() otp: string;
  @MinLength(6) matKhauMoi: string;
  @MinLength(6) xacNhanMatKhau: string;
}
