import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const statusProject = process.env.STATUS_PROJECT || 'development';
  const hostFrontend = process.env.HOST_FRONTED;
  const portBackend = process.env.PORT_BACKEND;
  
  // Configuración HTTPS
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, '..', 'certs', 'private.key')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'certs', 'certificate.crt')),
  };

  const app = await NestFactory.create(AppModule, {
    cors:
      statusProject === 'production'
        ? {
            origin: !hostFrontend ? 'https://cropco.org' : hostFrontend,
            credentials: true,
          }
        : true,
    httpsOptions: statusProject === 'production' ? httpsOptions : undefined,
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
