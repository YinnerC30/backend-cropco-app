import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: 400,
      transform: true,
    }),
  );

  // const config = new DocumentBuilder()
  //   .setTitle('Documentación de la API REST - Cropco')
  //   .setDescription(
  //     'A continuación encontrara las rutas existentes en la API, con sus respectivos parámetros, tipo de respuesta y códigos de estado.',
  //   )
  //   .setVersion('1.0')
  //   .build();
  // const document = SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT);
}
bootstrap();
