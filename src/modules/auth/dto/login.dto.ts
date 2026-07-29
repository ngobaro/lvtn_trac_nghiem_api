import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
export class LoginDto {
  @IsEmail() 
  email: string;
  
  @IsNotEmpty() 
  // @MinLength(7, { message: 'Mật khẩu phải có ít nhất 7 ký tự' })
  matKhau: string;
}
