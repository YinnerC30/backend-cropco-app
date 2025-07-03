import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { Administrator } from 'src/administrators/entities/administrator.entity';
import { RequestTools } from 'src/seed/helpers/RequestTools';
import { TestAppModule } from 'src/testing/testing-e2e.module';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';

describe('Auth Service (e2e)', () => {
  let app: INestApplication;
  let userTest: User;
  let token: string;
  const tokenExpired =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU0NDk3YmFhLTZiN2YtNDMzMS04ZDIzLWYyZTRhOGU4NWNiMyIsImlhdCI6MTc0NTcxMDU1OCwiZXhwIjoxNzQ1NzMyMTU4fQ.jEWpc0xnqLYKluFrlkuj6p2P7MZ4uV3fhFteUY2Y-Og';
  let reqTools: RequestTools;
  let tenantId: string;

  let adminUser: Administrator;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        errorHttpStatusCode: 400,
        transform: true,
      }),
    );

    await app.init();

    reqTools = new RequestTools({ moduleFixture });
    reqTools.setApp(app);
    await reqTools.initializeTenant();
    tenantId = reqTools.getTenantIdPublic();

    await reqTools.clearDatabaseControlled({ crops: true });

    userTest = await reqTools.createTestUser();
    token = await reqTools.generateTokenUser();

    adminUser = await reqTools.CreateAdminTest();
    adminToken = await reqTools.GenerateTokenAdmin(adminUser);
  });

  afterAll(async () => {
    await reqTools.deleteTestUser();
    await app.close();
  });

  console.log({ adminToken, adminUser });

  describe('/auth/login (POST)', () => {
    it('should throw an exception for not sending the data', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .set('x-tenant-id', tenantId)
        .expect(400);
      expect(body.message.length).toBeGreaterThan(0);
    });
    it('should throw an exception because the user was not found', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .set('x-tenant-id', tenantId)
        .send({ email: 'emailnotfound@gmail.com', password: '123456' })
        .expect(401);
      expect(body.message).toBe('Credentials are not valid (email)');
    });
    // it('should throw an exception because the user does not have permissions to log in to the system.', async () => {
    //   const user = await reqTools.CreateUser({});
    //   const { body } = await request
    //     .default(app.getHttpServer())
    //     .post('/auth/login')
    //     .set('x-tenant-id', tenantId)
    //     .send({ email: user.email, password: '123456' })
    //     .expect(401);
    //   expect(body.message).toBe(
    //     'The user does not have enough permissions to access',
    //   );
    // });
    it('should log in correctly to the system', async () => {
      const user = await reqTools.CreateUser({});
      // await authService.givePermissionsToModule(user.id, 'clients');
      const { body } = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .set('x-tenant-id', tenantId)
        .send({ email: user.email, password: '123456' })
        .expect(201);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('first_name');
      expect(body).toHaveProperty('last_name');
      expect(body).toHaveProperty('email');
      expect(body).toHaveProperty('is_active');
      expect(body).toHaveProperty('modules');
      expect(body).not.toHaveProperty('token');
      expect(body).not.toHaveProperty('password');
    });
  });

  describe('/auth/renew-token (PATCH)', () => {
    it('should throw an exception for not sending a JWT to the protected path /auth/renew-token', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch('/auth/renew-token')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(body.message.length).toBeGreaterThan(0);
    });
    it('should throw an exception for sending an invalid JWT to the protected path /auth/renew-token', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch('/auth/renew-token')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${'invalid'}`)
        .expect(401);
      expect(body.message).toBe('Unauthorized');
    });
    it('should return a new JWT correctly', async () => {
      // TODO: Quitar renew_token de las opciones de los módulos
      // await authService.addPermission(userTest.id, 'renew_token');
      const { body } = await request
        .default(app.getHttpServer())
        .patch('/auth/renew-token')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      // expect(body.token).toBeDefined();
    });
  });

  describe('/auth/check-status (GET)', () => {
    it('should throw an exception for not sending a JWT to the protected path /auth/check-status', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/auth/check-status')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(body.message.length).toBeGreaterThan(0);
    });
    it('should throw an exception for sending an invalid JWT to the protected path /auth/check-status', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/auth/check-status')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${'invalid'}`)
        .expect(401);
      expect(body.message).toBe('Unauthorized');
    });
    it('should accept the token sent', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/auth/check-status')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(body.message).toBe('Token valid');
      expect(body.statusCode).toBe(200);
    });

    it('should throw exception for sending an expired token.', async () => {
      await request
        .default(app.getHttpServer())
        .get('/auth/check-status')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${tokenExpired}`)
        .expect(401);
    });
  });

  describe('/auth/modules/all (GET)', () => {
    it('should return an array of modules with their actions', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/auth/modules/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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

  describe('/auth/management/login (POST)', () => {
    it('should throw an exception for not sending the data', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .post('/auth/management/login')
        .expect(400);
      expect(body.message.length).toBeGreaterThan(0);
    });
    it('should throw an exception because the user was not found', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .post('/auth/management/login')
        // .set('x-tenant-id', tenantId)
        .send({ email: 'emailnotfound@gmail.com', password: '123456' })
        .expect(401);
      expect(body.message).toBe('Credentials are not valid (email)');
    });
    // it('should throw an exception because the user does not have permissions to log in to the system.', async () => {
    //   const user = await reqTools.CreateUser({});
    //   const { body } = await request
    //     .default(app.getHttpServer())
    //     .post('/auth/login')
    //     .set('x-tenant-id', tenantId)
    //     .send({ email: user.email, password: '123456' })
    //     .expect(401);
    //   expect(body.message).toBe(
    //     'The user does not have enough permissions to access',
    //   );
    // });
    it('should log in correctly to the system', async () => {
      const user = await reqTools.CreateUser({});
      // await authService.givePermissionsToModule(user.id, 'clients');
      const { body } = await request
        .default(app.getHttpServer())
        .post('/auth/management/login')
        // .set('x-tenant-id', tenantId)
        .send({ email: adminUser.email, password: '123456' })
        .expect(201);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('first_name');
      expect(body).toHaveProperty('last_name');
      expect(body).toHaveProperty('email');
      expect(body).toHaveProperty('is_active');
      expect(body).toHaveProperty('role');
      // expect(body).toHaveProperty('modules');
      expect(body).not.toHaveProperty('token');
      expect(body).not.toHaveProperty('password');
    });
  });

  describe('/auth/management/check-status (GET)', () => {
    it('should throw an exception for not sending a JWT to the protected path /auth/management/check-status', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/auth/management/check-status')
        .expect(401);
      expect(body.message.length).toBeGreaterThan(0);
    });
    it('should throw an exception for sending an invalid JWT to the protected path /auth/management/check-status', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/auth/management/check-status')
        .set('Cookie', `administrator-token=${'invalid'}`)
        .expect(401);
      expect(body.message).toBe('Unauthorized');
    });
    it('should accept the token sent', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/auth/management/check-status')
        .set('Cookie', `administrator-token=${adminToken}`)
        .expect(200);
      expect(body.message).toBe('Token valid');
      expect(body.statusCode).toBe(200);
    });

    it('should throw exception for sending an expired token.', async () => {
      await request
        .default(app.getHttpServer())
        .get('/auth/management/check-status')
        .set('Cookie', `administrator-token=${tokenExpired}`)
        .expect(401);
    });
  });
});
