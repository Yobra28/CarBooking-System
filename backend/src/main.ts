/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure specific CORS options
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:4200',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4200',
      'https://localhost:4200',
      'https://127.0.0.1:4200',
      'https://car-booking-system-vhlq.vercel.app',
      'https://car-booking-system-3yhr.vercel.app',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With, Accept',
  });

  await app.listen(process.env.PORT ?? 3000);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
