import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptor/transform.interceptor';
import { join } from 'path';
import * as express from 'express';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = new Logger();
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Trasforma i payload in DTO automaticamente
      whitelist: true, // Rimuove proprietà non dichiarate nei DTO
      forbidNonWhitelisted: true, // Lancia errore se ci sono proprietà extra
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(process.env.PORT ?? 3000);
  logger.log(`Application listening on port ${process.env.PORT ?? 3000}`);
}
void bootstrap();
