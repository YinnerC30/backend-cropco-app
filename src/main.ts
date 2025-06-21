import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
        // Permitir requests sin origin (como aplicaciones móviles o Postman)
        if (!origin) {
          return callback(null, true);
        }

        // Validar dominio principal y subdominios
        const allowedDomains = [
          'https://cropco.org',
          'http://localhost:3000',
          'http://localhost:3001',
        ];

        // Verificar si es el dominio principal
        if (allowedDomains.includes(origin)) {
          return callback(null, true);
        }

        // Verificar si es un subdominio de cropco.org
        if (origin.startsWith('https://') && origin.endsWith('.cropco.org')) {
          return callback(null, true);
        }

        // Verificar si es un subdominio de localhost para desarrollo
        if (origin.startsWith('http://') && origin.includes('.localhost:')) {
          return callback(null, true);
        }

        // Si no coincide con ningún patrón permitido
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'x-tenant-id',
        'x-tenant-token',
      ],
      credentials: true,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: 400,
      transform: true,
    }),
  );

  await app.listen(3000);
}
bootstrap();
