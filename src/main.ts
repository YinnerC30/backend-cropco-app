import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const statusProject = process.env.STATUS_PROJECT || 'development';
  const app = await NestFactory.create(AppModule, {
    cors:
      statusProject === 'production'
        ? {
            origin: 'https://cropco.netlify.app',
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
  console.log('Application is running on port', process.env.PORT || 3000);
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
