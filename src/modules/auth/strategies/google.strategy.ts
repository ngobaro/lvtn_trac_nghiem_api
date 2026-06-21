import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'default_client_id',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'default_client_secret',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    try {
      console.log('Google Profile received:', JSON.stringify(profile, null, 2));

      if (!profile || !profile.emails || !profile.emails.length) {
        return done(new Error('Google profile is missing email'), undefined);
      }

      const user = {
        email: profile.emails[0].value,
        tenNguoiDung: profile.displayName ||
          (profile.name?.givenName + ' ' + profile.name?.familyName).trim(),
        googleId: profile.id,
        avatar: profile.photos?.[0]?.value,
      };

      done(null, user);
    } catch (error) {
      console.error('Google Strategy Error:', error);
      done(error, undefined);
    }
  }
}
