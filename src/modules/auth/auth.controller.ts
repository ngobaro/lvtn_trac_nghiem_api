import { Controller, Post, Get, Body, UseGuards, Patch, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Req() req: any) { return this.authService.login(req.user); }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() { }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any) {
    return this.authService.loginGoogle(req.user);
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  refresh(@Req() req: any) { return this.authService.refreshToken(req.user); }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout() { return null; } // client xóa token

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.authService.forgotPassword(dto.email); }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) { return this.authService.verifyOtp(dto.email, dto.otp); }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.matKhauMoi);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.maNguoiDung, dto.matKhauHienTai, dto.matKhauMoi);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: any) { return this.authService.getMe(user.maNguoiDung); }
}
