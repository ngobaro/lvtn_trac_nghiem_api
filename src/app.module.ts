import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import googleOauthConfig from './config/google-oauth.config';
import appConfig from './config/app.config';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
       load: [
        databaseConfig,
        jwtConfig,
        mailConfig,
        googleOauthConfig,
        appConfig,
      ],
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
