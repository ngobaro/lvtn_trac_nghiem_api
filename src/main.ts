import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// Fail-fast: từ chối khởi động nếu thiếu biến môi trường bắt buộc,
// tránh chạy ngầm với secret yếu mặc định.
function kiemTraBienMoiTruong() {
  const batBuoc = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
  ];
  const thieu = batBuoc.filter((k) => !process.env[k]);
  if (thieu.length)
    throw new Error(`Thiếu biến môi trường bắt buộc: ${thieu.join(', ')}`);
}

async function bootstrap() {
  kiemTraBienMoiTruong();
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const prefix = configService.get<string>('API_PREFIX') || 'api';
  app.setGlobalPrefix(prefix);

  app.enableCors({ origin: '*' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(new Reflector()));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
