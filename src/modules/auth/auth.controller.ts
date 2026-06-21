import { Controller, Post, Get, Body, UseGuards, Patch, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { VaiTro } from 'src/common/enums/vai-tro.enum';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @ResponseMessage('Đăng ký thành công')
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @Post('login')
  @UseGuards(AuthGuard('local'))
  @ResponseMessage('Đăng nhập thành công')
  login(@Req() req: any) { return this.authService.login(req.user); }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() { }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any) {
    return this.authService.loginGoogle(req.user);
  }

  @Post('google/confirm-role')
  @ResponseMessage('Đăng nhập Google thành công')
  confirmRoleGoogle(@Body() body: { tempToken: string; vaiTro: VaiTro }) {
    return this.authService.confirmRoleGoogle(body.tempToken, body.vaiTro);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @ResponseMessage('Cấp lại token thành công')
  refresh(@Req() req: any) { return this.authService.refreshToken(req.user); }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Đăng xuất thành công')
  logout() { return null; }

  @Post('forgot-password')
  @ResponseMessage('Gửi OTP thành công')
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.authService.forgotPassword(dto.email); }

  @Post('verify-otp')
  @ResponseMessage('Xác nhận OTP thành công')
  verifyOtp(@Body() dto: VerifyOtpDto) { return this.authService.verifyOtp(dto.email, dto.otp); }

  @Post('reset-password')
  @ResponseMessage('Đặt lại mật khẩu thành công')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.matKhauMoi);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Đổi mật khẩu thành công')
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.maNguoiDung, dto.matKhauHienTai, dto.matKhauMoi);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Lấy thông tin thành công')
  getMe(@CurrentUser() user: any) { return this.authService.getMe(user.maNguoiDung); }
}
