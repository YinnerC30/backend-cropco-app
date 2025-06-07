import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const statusProject = process.env.STATUS_PROJECT || 'development';
  const hostFrontend = process.env.HOST_FRONTED;
  const app = await NestFactory.create(AppModule, {
    cors:
      statusProject === 'production'
        ? {
            origin: !hostFrontend ? 'https://cropco.netlify.app' : hostFrontend,
            credentials: true,
          }
        : true,
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
    process.env.PORT_BACKEND || 3000,
    ' and cors ',
    hostFrontend,
  );
  await app.listen(process.env.PORT_BACKEND || 3000);
}
bootstrap();
