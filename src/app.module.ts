import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { databaseConfig } from './config/database.config';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { QuestionsModule } from './modules/questions/questions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),

    AuthModule,
    UsersModule,
    SubjectsModule,
    QuestionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
