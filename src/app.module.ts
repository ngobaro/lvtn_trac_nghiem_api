import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { databaseConfig } from './config/database.config';
// import { SubjectsModule } from './modules/subjects/subjects.module';
// import { QuestionsModule } from './modules/questions/questions.module';
// import { ExamsModule } from './modules/exams/exams.module';
// import { ExamRoomsModule } from './modules/exam-rooms/exam-rooms.module';
// import { ExamSessionsModule } from './modules/exam-sessions/exam-sessions.module';
// import { ResultsModule } from './modules/results/results.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),

    AuthModule,
    UsersModule,
    // SubjectsModule,
    // QuestionsModule,
    // ExamsModule,
    // ExamRoomsModule,
    // ExamSessionsModule,
    // ResultsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
