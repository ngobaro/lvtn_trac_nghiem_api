import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME,
  port: Number(process.env.APP_PORT),
  env: process.env.NODE_ENV,
  apiPrefix: process.env.API_PREFIX,
}));