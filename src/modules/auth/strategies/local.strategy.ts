//src/modules/auth/strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email',
      passwordField: 'matKhau'
     });
  }
  async validate(email: string, matKhau: string) {
    const user = await this.authService.validateLocal(email, matKhau);
    if (!user) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    return user;
  }
}
