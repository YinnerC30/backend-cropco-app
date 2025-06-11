import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const statusProject = process.env.STATUS_PROJECT || 'development';
  console.log("🚀 ~ bootstrap ~ statusProject:", statusProject)
  const hostFrontend = process.env.HOST_FRONTED;
  console.log("🚀 ~ bootstrap ~ hostFrontend:", hostFrontend)
  const portBackend = process.env.PORT_BACKEND;
  console.log("🚀 ~ bootstrap ~ portBackend:", portBackend)

  const app = await NestFactory.create(AppModule, {
    // cors: {
    //   origin: hostFrontend,
    //   methods: ['GET', 'POST', 'PUT', 'DELETE'],
    //   allowedHeaders: ['Content-Type', 'Authorization'],
    // },
    // httpsOptions: {
    //   rejectUnauthorized: false,
    // },
    cors: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: 400,
      transform: true,
    }),
  );

  console.log(
    'Application is running on port',
    portBackend,
    ' and cors ',
    hostFrontend,
  );
  await app.listen(!portBackend ? 3000 : portBackend);
}
bootstrap();
