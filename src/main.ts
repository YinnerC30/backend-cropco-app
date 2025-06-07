import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const statusProject = process.env.STATUS_PROJECT || 'development';
  const hostFrontend = process.env.HOST_FRONTED;
  const portBackend = process.env.PORT_BACKEND;
  const app = await NestFactory.create(AppModule, {
    cors:
      statusProject === 'production'
        ? {
            origin: !hostFrontend ? 'https://cropco.netlify.app' : hostFrontend,
            credentials: true,
          }
        : true,
    // cors: true
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
