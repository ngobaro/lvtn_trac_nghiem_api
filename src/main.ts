import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const prefix = configService.get<string>('API_PREFIX') || 'api';
  app.setGlobalPrefix(prefix);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
