import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { SeedModule } from 'src/seed/seed.module';

import { UserDto } from './dto/user.dto';
import { UsersModule } from './users.module';

import cookieParser from 'cookie-parser';
import { Administrator } from 'src/administrators/entities/administrator.entity';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { RequestTools } from 'src/seed/helpers/RequestTools';
import { TenantDatabase } from 'src/tenants/entities/tenant-database.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { TenantMiddleware } from 'src/tenants/middleware/tenant.middleware';
import { TenantsModule } from 'src/tenants/tenants.module';
import * as request from 'supertest';
import { User } from './entities/user.entity';

// Módulo de prueba que configura el middleware
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.test',
      isGlobal: true,
    }),
    TenantsModule,
    UsersModule,
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
          database: 'cropco_management',
          entities: [Tenant, TenantDatabase, Administrator],
          synchronize: true,
          ssl: false,
          // logging: true,
        };
      },
    }),
    CommonModule,
    SeedModule,
    AuthModule,
  ],
})
export class TestAppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'administrators/(.*)', method: RequestMethod.ALL },
        { path: 'tenants/(.*)', method: RequestMethod.ALL },
        {
          path: '/auth/management/login',
          method: RequestMethod.POST,
        },
        {
          path: '/auth/management/check-status',
          method: RequestMethod.GET,
        },
      )
      .forRoutes('*');
  }
}

describe('UsersController e2e', () => {
  let app: INestApplication;
  let authService: AuthService;
  let userTest: User;
  let token: string;
  let reqTools: RequestTools;
  let tenantId: string;

  const userDtoTemplete: UserDto = {
    first_name: InformationGenerator.generateFirstName(),
    last_name: InformationGenerator.generateLastName(),
    email: InformationGenerator.generateEmail(),
    cell_phone_number: InformationGenerator.generateCellPhoneNumber(),
    password: '123456',
    actions: [],
  };

  const falseUserId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';

  const CreateUser = async ({
    mapperToDto = false,
    // convertToAdmin = false,
  }) => {
    const user = (await reqTools.createSeedData({ users: 1 })).history
      .insertedUsers[0];

    if (!mapperToDto) return user;

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: user.password,
      cell_phone_number: user.cell_phone_number,
      actions: user.actions,
    };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    reqTools = new RequestTools({ moduleFixture });

    authService = moduleFixture.get<AuthService>(AuthService);

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

    reqTools.setApp(app);
    await reqTools.initializeTenant('testtenantend');
    tenantId = reqTools.getTenantIdPublic();

    await reqTools.clearDatabaseControlled({ users: true });

    userTest = await reqTools.createTestUser();

    token = await reqTools.generateTokenUser();
  });

  afterAll(async () => {
    await reqTools.deleteTestUser();
    await app.close();
  });

  describe('users/all (GET)', () => {
    beforeAll(async () => {
      await Promise.all(Array.from({ length: 16 }).map(() => CreateUser({})));
      await reqTools.addActionToUser('find_all_users');
    });

    it('should throw an exception for not sending a JWT to the protected path /users/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/users/all')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only 10 users for default by not sending paging parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/users/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });

    it('should return the specified number of users passed by the paging arguments by the URL (1)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/users/all`)
        .query({ limit: 11, offset: 0 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(11);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
      response.body.records.forEach((user: User) => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('first_name');
        expect(user).toHaveProperty('last_name');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('cell_phone_number');
        expect(user).toHaveProperty('createdDate');
        expect(user).toHaveProperty('updatedDate');
        expect(user).toHaveProperty('deletedDate');
        expect(user.deletedDate).toBeNull();
      });
    });
    it('should return the specified number of users passed by the paging arguments by the URL (2)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/users/all`)
        .query({ limit: 11, offset: 1 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(2);
      response.body.records.forEach((user: User) => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('first_name');
        expect(user).toHaveProperty('last_name');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('cell_phone_number');
        expect(user).toHaveProperty('createdDate');
        expect(user).toHaveProperty('updatedDate');
        expect(user).toHaveProperty('deletedDate');
        expect(user.deletedDate).toBeNull();
      });
    });
    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/users/all')
        .query({ offset: 10 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no user records with the requested pagination',
      );
    });
  });

  describe('users/create (POST)', () => {
    beforeAll(async () => {
      // Se realiza una petición al endpoint de auth para añadir una acción al usuario de prueba antes de los tests
      await reqTools.addActionToUser('create_user');
    });

    it('should throw an exception for not sending a JWT to the protected path /users/create', async () => {
      const bodyRequest: UserDto = {
        ...userDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/users/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token.slice(0, 10)}`)
        .send(bodyRequest)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should create a new user', async () => {
      const bodyRequest: UserDto = {
        ...userDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/users/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(201);

      delete bodyRequest.password;
      expect(response.body).toMatchObject(bodyRequest);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'first_name must be shorter than or equal to 100 characters',
        'first_name must be a string',
        'last_name must be shorter than or equal to 100 characters',
        'last_name must be a string',
        'email must be shorter than or equal to 100 characters',
        'email must be an email',
        'email must be a string',
        'password must be shorter than or equal to 100 characters',
        'password must be longer than or equal to 6 characters',
        'password must be a string',
        'cell_phone_number must be longer than or equal to 9 characters',
        'cell_phone_number must be shorter than or equal to 15 characters',
        'cell_phone_number must be a string',
        'actions must be an array',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/users/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });

    it('should throw exception for trying to create a user with duplicate email.', async () => {
      const userWithInitialEmail = await CreateUser({});

      const bodyRequest: UserDto = {
        ...userDtoTemplete,
        email: userWithInitialEmail.email,
      };
      const { body } = await request
        .default(app.getHttpServer())
        .post('/users/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (email)=(${bodyRequest.email}) already exists.`,
      );
    });
  });

  describe('users/one/:id (GET)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('find_one_user');
    });

    it('should throw an exception for not sending a JWT to the protected path users/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/users/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get one normal user', async () => {
      const userNormal = await CreateUser({});

      const response = await request
        .default(app.getHttpServer())
        .get(`/users/one/${userNormal.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('first_name');
      expect(response.body).toHaveProperty('last_name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('cell_phone_number');
      expect(response.body).toHaveProperty('modules');
      expect(response.body.modules).toBeInstanceOf(Array);
    });
    it('should get one user with permissions', async () => {
      // const userAdmin = await seedService.CreateUser({ convertToAdmin: true });
      const userAdmin = await CreateUser({});

      const response = await request
        .default(app.getHttpServer())
        .get(`/users/one/${userAdmin.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('first_name');
      expect(response.body).toHaveProperty('last_name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('cell_phone_number');
      expect(response.body).toHaveProperty('modules');
      expect(response.body.modules).toBeInstanceOf(Array);

      response.body.modules.forEach((module: any) => {
        expect(module).toHaveProperty('name');
        expect(module).toHaveProperty('actions');
        expect(module.actions).toBeInstanceOf(Array);
        module.actions.forEach((action: any) => {
          expect(action).toHaveProperty('id');
          expect(action).toHaveProperty('description');
          expect(action).toHaveProperty('path_endpoint');
          expect(action).toHaveProperty('name');
        });
      });
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/users/one/1234`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });
    it('should throw exception for not finding user by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/users/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(`User with id: ${falseUserId} not found`);
    });
    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/users/one/`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('users/update/one/:id (PUT)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('update_one_user');
    });

    it('should throw an exception for not sending a JWT to the protected path users/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/users/update/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should update one user', async () => {
      const { id, password, ...rest } = await CreateUser({ mapperToDto: true });

      const bodyRequest = {
        ...rest,
        first_name: 'John Es Modify',
        last_name: 'Doe Modify',
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/users/update/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(200);

      expect(body.first_name).toEqual(bodyRequest.first_name);
      expect(body.last_name).toEqual(bodyRequest.last_name);
    });

    it('should throw exception for not finding user to update', async () => {
      const { password, ...bodyRequest } = userDtoTemplete;

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/users/update/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(404);

      expect(body.message).toEqual(`User with id: ${falseUserId} not found`);
    });

    it('should throw exception for sending incorrect properties', async () => {
      const bodyRequest = {
        year: 2025,
      };
      const { body } = await request
        .default(app.getHttpServer())
        .put(`/users/update/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });

    it('should throw exception for trying to update the email for one that is in use.', async () => {
      const userWithInitialEmail = await CreateUser({});
      const { id, password, ...rest } = await CreateUser({ mapperToDto: true });

      const bodyRequest = {
        ...rest,
        email: userWithInitialEmail.email,
      };
      const { body } = await request
        .default(app.getHttpServer())
        .put(`/users/update/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (email)=(${userWithInitialEmail.email}) already exists.`,
      );
    });
  });

  describe('users/remove/one/:id (DELETE)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('remove_one_user');
    });

    it('should throw an exception for not sending a JWT to the protected path users/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/users/remove/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete one user', async () => {
      const { id } = await CreateUser({});

      await request
        .default(app.getHttpServer())
        .delete(`/users/remove/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      // const { notFound, body, status } = await request
      //   .default(app.getHttpServer())
      //   .get(`/users/one/${id}`)
      //   .set('x-tenant-id', tenantId)
      //   .set('Cookie', `user-token=${token}`);
      // // .expect(404);
      // console.log({ body, status });
      // expect(notFound).toBe(true);
    });
    it('You should throw exception for trying to delete a user that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/users/remove/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(`User with id: ${falseUserId} not found`);
    });
  });

  describe('users/remove/bulk (DELETE)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('remove_bulk_users');
    });

    it('should throw an exception for not sending a JWT to the protected path users/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/users/remove/bulk')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete users bulk', async () => {
      // Crear usuarios de prueba
      const [user1, user2, user3] = await Promise.all([
        CreateUser({}),
        CreateUser({}),
        CreateUser({}),
      ]);

      const bodyRequest: RemoveBulkRecordsDto<User> = {
        recordsIds: [{ id: user1.id }, { id: user2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/users/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(200);

      // const [deletedUser1, deletedUser2, remainingUser3] = await Promise.all([
      //   userRepository.findOne({ where: { id: user1.id } }),
      //   userRepository.findOne({ where: { id: user2.id } }),
      //   userRepository.findOne({ where: { id: user3.id } }),
      // ]);

      // expect(deletedUser1).toBeNull();
      // expect(deletedUser2).toBeNull();
      // expect(remainingUser3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const bodyRequest = { recordsIds: [] };
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/users/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });
  });

  describe('users/reset-password/one/:id (PUT)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('reset_password_user');
    });

    it('should throw an exception for not sending a JWT to the protected path users/reset-password/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/users/reset-password/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should reset the password for one user', async () => {
      const { id } = await CreateUser({});

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/users/reset-password/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(body).toHaveProperty('password');
      expect(body.password).not.toEqual('123456');
      expect(body.password).toBeDefined();
    });
  });

  describe('users/change-password/one (PUT)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('change_password_user');
    });

    it('should throw an exception for not sending a JWT to the protected path users/change-password/one', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/users/change-password/one`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should change the password for one user', async () => {
      const userChangePassword = await CreateUser({});
      const localToken =
        await reqTools.generateTokenForUser(userChangePassword);
      await reqTools.addActionForUser(
        userChangePassword.id,
        'change_password_user',
      );

      const bodyRequest = {
        old_password: '123456',
        new_password: 'otraClave1234',
      };

      const response = await request
        .default(app.getHttpServer())
        .put(`/users/change-password/one`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${localToken}`)
        .send(bodyRequest)
        .expect(200);
    });
  });

  describe('users/toggle-status/one/:id (PUT)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('toggle_status_user');
    });

    it('should throw an exception for not sending a JWT to the protected path users/toggle-status/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/users/toggle-status/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should toggle status for one user', async () => {
      const { id } = await CreateUser({});

      await request
        .default(app.getHttpServer())
        .put(`/users/toggle-status/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      // const user = await userRepository.findOne({ where: { id } });
      // expect(user).toHaveProperty('is_active');
      // expect(user.is_active).toEqual(false);
    });
  });

  describe('should throw an exception because the user JWT does not have permissions for these actions', () => {
    beforeAll(async () => {
      await Promise.all([
        reqTools.removePermissionFromUser(userTest.id, 'toggle_status_user'),
        reqTools.removePermissionFromUser(userTest.id, 'change_password_user'),
        reqTools.removePermissionFromUser(userTest.id, 'reset_password_user'),
        reqTools.removePermissionFromUser(userTest.id, 'remove_bulk_users'),
        reqTools.removePermissionFromUser(userTest.id, 'remove_one_user'),
        reqTools.removePermissionFromUser(userTest.id, 'update_one_user'),
        reqTools.removePermissionFromUser(userTest.id, 'find_one_user'),
        reqTools.removePermissionFromUser(userTest.id, 'create_user'),
        reqTools.removePermissionFromUser(userTest.id, 'find_all_users'),
      ]);
    });

    it('should throw an exception because the user JWT does not have permissions for this action users/toggle-status/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/users/toggle-status/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`);
      // .expect(403);

      console.log(response.body, response.status);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action users/change-password/one', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/users/change-password/one`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action users/reset-password/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/users/reset-password/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action users/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/users/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action users/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/users/remove/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action users/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/users/update/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action users/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/users/one/${falseUserId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /users/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/users/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /users/create', async () => {
      const bodyRequest: UserDto = {
        ...userDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/users/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });
});
