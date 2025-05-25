import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { SeedService } from 'src/seed/seed.service';
import { SeedModule } from 'src/seed/seed.module';

describe('Auth Service (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let seedService: SeedService;
  let userTest: User;
  let token: string;
  const tokenExpired =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU0NDk3YmFhLTZiN2YtNDMzMS04ZDIzLWYyZTRhOGU4NWNiMyIsImlhdCI6MTc0NTcxMDU1OCwiZXhwIjoxNzQ1NzMyMTU4fQ.jEWpc0xnqLYKluFrlkuj6p2P7MZ4uV3fhFteUY2Y-Og';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            return {
              type: 'postgres',
              host: configService.get<string>('DB_HOST'),
              port: configService.get<number>('DB_PORT'),
              username: configService.get<string>('DB_USERNAME'),
              password: configService.get<string>('DB_PASSWORD'),
              database: configService.get<string>('DB_NAME'),
              entities: [__dirname + '../../**/*.entity{.ts,.js}'],
              synchronize: true,
              // ssl: {
              //   rejectUnauthorized: false, // Be cautious with this in production
              // },
            };
          },
        }),
        AuthModule,
        SeedModule,
      ],
    }).compile();

    authService = moduleFixture.get<AuthService>(AuthService);
    seedService = moduleFixture.get<SeedService>(SeedService);

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        errorHttpStatusCode: 400,
        transform: true,
      }),
    );

    await app.init();

    userTest = (await seedService.CreateUser({})) as User;
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should throw an exception for not sending the data', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .expect(400);
      expect(body.message.length).toBeGreaterThan(0);
    });
    it('should throw an exception because the user was not found', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'emailnotfound@gmail.com', password: '123456' })
        .expect(401);
      expect(body.message).toBe('Credentials are not valid (email)');
    });
    it('should throw an exception because the user does not have permissions to log in to the system.', async () => {
      const user = await seedService.CreateUser({});
      const { body } = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: '123456' })
        .expect(403);
      expect(body.message).toBe(
        'The user does not have enough permissions to access',
      );
    });
    it('should log in correctly to the system', async () => {
      const user = await seedService.CreateUser({});
      await authService.givePermissionsToModule(user.id, 'clients');

      const { body } = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: '123456' })
        .expect(201);

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('first_name');
      expect(body).toHaveProperty('last_name');
      expect(body).toHaveProperty('email');
      expect(body).toHaveProperty('is_active');
      expect(body).toHaveProperty('modules');
      expect(body).toHaveProperty('token');
      expect(body).not.toHaveProperty('password');
    });
  });

  describe('/auth/renew-token (PATCH)', () => {
    it('should throw an exception for not sending a JWT to the protected path /auth/renew-token', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch('/auth/renew-token')
        .expect(401);
      expect(body.message.length).toBeGreaterThan(0);
    });
    it('should throw an exception for sending an invalid JWT to the protected path /auth/renew-token', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch('/auth/renew-token')
        .set('Authorization', 'Bearer invalidToken')
        .expect(401);
      expect(body.message).toBe('Unauthorized');
    });
    it('should return a new JWT correctly', async () => {
      // TODO: Quitar renew_token de las opciones de los módulos
      await authService.addPermission(userTest.id, 'renew_token');
      const { body } = await request
        .default(app.getHttpServer())
        .patch('/auth/renew-token')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(body.token).toBeDefined();
    });
  });

  describe('/auth/check-status (GET)', () => {
    it('should throw an exception for not sending a JWT to the protected path /auth/check-status', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/auth/check-status')
        .expect(401);
      expect(body.message.length).toBeGreaterThan(0);
    });
    it('should throw an exception for sending an invalid JWT to the protected path /auth/check-status', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/auth/check-status')
        .set('Authorization', 'Bearer invalidToken')
        .expect(401);
      expect(body.message).toBe('Unauthorized');
    });
    it('should accept the token sent', async () => {
      // TODO: Quitar check-status de las opciones de los módulos
      await authService.addPermission(userTest.id, 'check_status_token');
      const { body } = await request
        .default(app.getHttpServer())
        .get('/auth/check-status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(body.message).toBe('Token valid');
      expect(body.statusCode).toBe(200);
    });

    it('should throw exception for sending an expired token.', async () => {
      await request
        .default(app.getHttpServer())
        .get('/auth/check-status')
        .set('Authorization', `Bearer ${tokenExpired}`)
        .expect(401);
    });
  });

  describe('/auth/modules/all (GET)', () => {
    it('should return an array of modules with their actions', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/auth/modules/all')
        .expect(200);
      expect(body).toBeInstanceOf(Array);
      body.forEach((module) => {
        expect(module).toHaveProperty('id');
        expect(module).toHaveProperty('label');
        expect(module).toHaveProperty('name');
        expect(module).toHaveProperty('actions');
        expect(module.actions).toBeInstanceOf(Array);
      });
    });
  });
});
