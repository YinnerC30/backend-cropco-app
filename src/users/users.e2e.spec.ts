import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { describe } from 'node:test';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';

import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersModule } from './users.module';

import * as request from 'supertest';
import { User } from './entities/user.entity';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let seedService: SeedService;
  let authService: AuthService;
  let userTest: User;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
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
              database: configService.get<string>('DB_NAME'),
              entities: [__dirname + '../../**/*.entity{.ts,.js}'],
              synchronize: true,
            };
          },
        }),
        CommonModule,
        SeedModule,
        AuthModule,
      ],
    }).compile();

    seedService = moduleFixture.get<SeedService>(SeedService);
    authService = moduleFixture.get<AuthService>(AuthService);

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

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );

    await userRepository.delete({});
    userTest = await authService.createUserToTests();
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await app.close();
  });

  async function createTestUser(data: CreateUserDto) {
    const user = userRepository.create(data);
    return await userRepository.save(user);
  }

  describe('users/create (POST)', () => {
    it('should throw an exception for not sending a JWT to the protected path /users/create', async () => {
      const data: CreateUserDto = {
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        password: '123456',
        actions: [],
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/users/create')
        .send(data)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('It should throw an exception because the user JWT does not have permissions for this action /users/create', async () => {
      await authService.removePermission(userTest.id, 'create_user');

      const data: CreateUserDto = {
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        password: '123456',
        actions: [],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/users/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should create a new user', async () => {
      await authService.addPermission(userTest.id, 'create_user');

      const data: CreateUserDto = {
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        password: '123456',
        actions: [],
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/users/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(201);

      delete data.password;
      expect(response.body).toMatchObject(data);
    });

    it('Should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'first_name must be shorter than or equal to 100 characters',
        'first_name must be a string',
        'last_name must be shorter than or equal to 100 characters',
        'last_name must be a string',
        'email must be shorter than or equal to 100 characters',
        'email must be an email',
        'email must be a string',
        'password must be longer than or equal to 6 characters',
        'password must be shorter than or equal to 100 characters',
        'password must be a string',
        'cell_phone_number must be shorter than or equal to 10 characters',
        'cell_phone_number must be a string',
        'actions must be an array',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/users/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });

    it('Should throw exception for trying to create a user with duplicate email.', async () => {
      await createTestUser({
        first_name: 'Stiven',
        last_name: 'Gomez',
        email: 'Stiven@gmail.com',
        cell_phone_number: '3146652134',
        password: '123456',
        actions: [],
      });

      const data: CreateUserDto = {
        first_name: 'David',
        last_name: 'Gomez',
        email: 'Stiven@gmail.com',
        cell_phone_number: '3146652134',
        password: '123456',
        actions: [],
      };
      const { body } = await request
        .default(app.getHttpServer())
        .post('/users/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(400);
      expect(body.message).toEqual(
        'Unique constraint violation, Key (email)=(stiven@gmail.com) already exists.',
      );
    });
  });

  describe('users/all (GET)', () => {
    beforeAll(async () => {
      const result = await seedService.insertNewUsers();
      if (result) {
        console.log('Inserted 14 user records for testing');
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /users/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/users/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('It should throw an exception because the user JWT does not have permissions for this action /users/all', async () => {
      await authService.removePermission(userTest.id, 'find_all_users');
      const response = await request
        .default(app.getHttpServer())
        .get('/users/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get only 10 users for default by not sending paging parameters', async () => {
      await authService.addPermission(userTest.id, 'find_all_users');
      const response = await request
        .default(app.getHttpServer())
        .get('/users/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });

    it('should return the specified number of users passed by the paging arguments by the URL', async () => {
      const response1 = await request
        .default(app.getHttpServer())
        .get(`/users/all`)
        .query({ limit: 11, offset: 0 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response1.body.total_row_count).toEqual(17);
      expect(response1.body.current_row_count).toEqual(11);
      expect(response1.body.total_page_count).toEqual(2);
      expect(response1.body.current_page_count).toEqual(1);
      response1.body.records.forEach((user: User) => {
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

      const response2 = await request
        .default(app.getHttpServer())
        .get(`/users/all`)
        .query({ limit: 11, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response2.body.total_row_count).toEqual(17);
      expect(response2.body.current_row_count).toEqual(6);
      expect(response2.body.total_page_count).toEqual(2);
      expect(response2.body.current_page_count).toEqual(2);
      response2.body.records.forEach((user: User) => {
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
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no user records with the requested pagination',
      );
    });
  });

  describe('users/one/:id (GET)', () => {
    const userId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path users/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/users/one/${userId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('It should throw an exception because the user JWT does not have permissions for this action users/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_user');
      const response = await request
        .default(app.getHttpServer())
        .get(`/users/one/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('Should get one user', async () => {
      // Crear un usere de prueba
      await authService.addPermission(userTest.id, 'find_one_user');
      const { id } = await createTestUser({
        first_name: 'John 3',
        last_name: 'Doe',
        email: 'john.doe3@example.com',
        cell_phone_number: '3007890123',
        password: '123456',
        actions: [],
      });

      const response = await request
        .default(app.getHttpServer())
        .get(`/users/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('first_name');
      expect(response.body).toHaveProperty('last_name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('cell_phone_number');
      expect(response.body).toHaveProperty('modules');
      expect(response.body.modules).toBeInstanceOf(Array);

      const response2 = await request
        .default(app.getHttpServer())
        .get(`/users/one/${userTest.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response2.body).toHaveProperty('id');
      expect(response2.body).toHaveProperty('first_name');
      expect(response2.body).toHaveProperty('last_name');
      expect(response2.body).toHaveProperty('email');
      expect(response2.body).toHaveProperty('cell_phone_number');
      expect(response2.body).toHaveProperty('modules');
      expect(response2.body.modules).toBeInstanceOf(Array);

      response2.body.modules.forEach((module: any) => {
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

    it('Should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/users/one/1234`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });
    it('Should throw exception for not finding user by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/users/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'User with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });
    it('Should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/users/one/`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  // describe('users/update/one/:id (PATCH)', () => {
  //   const userId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
  //   it('should throw an exception for not sending a JWT to the protected path users/update/one/:id', async () => {
  //     const response = await request
  //       .default(app.getHttpServer())
  //       .patch(`/users/update/one/${userId}`)
  //       .expect(401);
  //     expect(response.body.message).toEqual('Unauthorized');
  //   });

  //   it('It should throw an exception because the user JWT does not have permissions for this action users/update/one/:id', async () => {
  //     await authService.removePermission(userTest.id, 'find_one_user');
  //     const response = await request
  //       .default(app.getHttpServer())
  //       .patch(`/users/update/one/${userId}`)
  //       .set('Authorization', `Bearer ${token}`)
  //       .expect(403);
  //     expect(response.body.message).toEqual(
  //       `User ${userTest.first_name} need a permit for this action`,
  //     );
  //   });

  //   it('Should update one user', async () => {
  //     await authService.addPermission(userTest.id, 'update_one_user');
  //     const { id } = await createTestUser({
  //       first_name: 'John 3.5',
  //       last_name: 'Doe',
  //       email: 'john.doe3.5@example.com',
  //       cell_phone_number: '3007890123',
  //       address: '123 Main St',
  //     });
  //     const { body } = await request
  //       .default(app.getHttpServer())
  //       .patch(`/users/update/one/${id}`)
  //       .set('Authorization', `Bearer ${token}`)
  //       .send({ first_name: 'John 4', last_name: 'Doe 4' })
  //       .expect(200);

  //     expect(body.first_name).toEqual('John 4');
  //     expect(body.last_name).toEqual('Doe 4');
  //     expect(body.email).toEqual('john.doe3.5@example.com');
  //     expect(body.cell_phone_number).toEqual('3007890123');
  //     expect(body.address).toEqual('123 Main St');
  //   });

  //   it('Should throw exception for not finding user to update', async () => {
  //     const { body } = await request
  //       .default(app.getHttpServer())
  //       .patch(`/users/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
  //       .set('Authorization', `Bearer ${token}`)
  //       .send({ first_name: 'John 4' })
  //       .expect(404);
  //     expect(body.message).toEqual(
  //       'User with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
  //     );
  //   });

  //   it('Should throw exception for sending incorrect properties', async () => {
  //     const { body } = await request
  //       .default(app.getHttpServer())
  //       .patch(`/users/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
  //       .set('Authorization', `Bearer ${token}`)
  //       .send({ year: 2025 })
  //       .expect(400);
  //     expect(body.message).toContain('property year should not exist');
  //   });
  //   it('It should throw exception for trying to update the email for one that is in use.', async () => {
  //     const { id } = await createTestUser({
  //       first_name: 'Alan',
  //       last_name: 'Demo',
  //       email: 'alandemo@example.com',
  //       cell_phone_number: '3007890123',
  //       address: '123 Main St',
  //     });
  //     const { body } = await request
  //       .default(app.getHttpServer())
  //       .patch(`/users/update/one/${id}`)
  //       .set('Authorization', `Bearer ${token}`)
  //       .send({ email: 'john.doe3.5@example.com' })
  //       .expect(400);
  //     expect(body.message).toEqual(
  //       'Unique constraint violation, Key (email)=(john.doe3.5@example.com) already exists.',
  //     );
  //   });
  // });

  // describe('users/remove/one/:id (DELETE)', () => {
  //   const userId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
  //   it('should throw an exception for not sending a JWT to the protected path users/remove/one/:id', async () => {
  //     const response = await request
  //       .default(app.getHttpServer())
  //       .delete(`/users/remove/one/${userId}`)
  //       .expect(401);
  //     expect(response.body.message).toEqual('Unauthorized');
  //   });

  //   it('It should throw an exception because the user JWT does not have permissions for this action users/remove/one/:id', async () => {
  //     await authService.removePermission(userTest.id, 'remove_one_user');
  //     const response = await request
  //       .default(app.getHttpServer())
  //       .delete(`/users/remove/one/${userId}`)
  //       .set('Authorization', `Bearer ${token}`)
  //       .expect(403);
  //     expect(response.body.message).toEqual(
  //       `User ${userTest.first_name} need a permit for this action`,
  //     );
  //   });

  //   it('Should delete one user', async () => {
  //     await authService.addPermission(userTest.id, 'remove_one_user');
  //     const { id } = await createTestUser({
  //       first_name: 'Ana 4.5',
  //       last_name: 'Doe',
  //       email: 'Ana.doe4.5@example.com',
  //       cell_phone_number: '3007890123',
  //       address: '123 Main St',
  //     });

  //     await request
  //       .default(app.getHttpServer())
  //       .delete(`/users/remove/one/${id}`)
  //       .set('Authorization', `Bearer ${token}`)
  //       .expect(200);

  //     const { notFound } = await request
  //       .default(app.getHttpServer())
  //       .get(`/users/one/${id}`)
  //       .set('Authorization', `Bearer ${token}`)
  //       .expect(404);
  //     expect(notFound).toBe(true);
  //   });
  //   it('You should throw exception for trying to delete a user that does not exist.', async () => {
  //     const { body } = await request
  //       .default(app.getHttpServer())
  //       .delete(`/users/remove/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
  //       .set('Authorization', `Bearer ${token}`)
  //       .expect(404);
  //     expect(body.message).toEqual(
  //       'User with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
  //     );
  //   });

  //   it('Should throw an exception when trying to delete a user with harvests or works with pending payment.', async () => {
  //     // Crear usere de prueba
  //     const user1 = await createTestUser({
  //       first_name: 'User for harvest',
  //       last_name: 'Doe',
  //       email: 'userforharvest@example.com',
  //       cell_phone_number: '3007890123',
  //       address: '123 Main St',
  //     });
  //     const user2 = await createTestUser({
  //       first_name: 'User for work',
  //       last_name: 'Doe',
  //       email: 'userforwork@example.com',
  //       cell_phone_number: '3007890123',
  //       address: '123 Main St',
  //     });

  //     // Crear cultivo de prueba
  //     const crop = await cropService.create({
  //       name: `Crop for sale ${Math.random() * 100}`,
  //       description: 'Crop for sale',
  //       units: 10,
  //       location: 'Main St',
  //       date_of_creation: new Date().toISOString(),
  //     } as CreateCropDto);

  //     // Crear cosecha de prueba
  //     const harvestData = {
  //       date: new Date().toISOString(),
  //       crop: { id: crop.id },
  //       details: [
  //         { user: { id: user1.id }, total: 10, value_pay: 1000 },
  //       ],
  //       total: 10,
  //       value_pay: 1000,
  //       observation: 'description demo test creation harvest...',
  //     };

  //     await harvestService.create(harvestData as CreateHarvestDto);

  //     await workService.create({
  //       date: new Date().toISOString(),
  //       crop: { id: crop.id },
  //       details: [
  //         {
  //           user: { id: user2.id },
  //           value_pay: 1000,
  //           payment_is_pending: true,
  //         },
  //       ],
  //       total: 10,
  //       value_pay: 1000,
  //       description: 'description demo test creation harvest...',
  //     } as any);

  //     // Intentar eliminar el user
  //     const { body: body1 } = await request
  //       .default(app.getHttpServer())
  //       .delete(`/users/remove/one/${user1.id}`)
  //       .set('Authorization', `Bearer ${token}`)
  //       .expect(409);
  //     expect(body1.message).toEqual(
  //       `Cannot remove user with harvests pending payment`,
  //     );

  //     const { body: body2 } = await request
  //       .default(app.getHttpServer())
  //       .delete(`/users/remove/one/${user2.id}`)
  //       .set('Authorization', `Bearer ${token}`)
  //       .expect(409);
  //     expect(body2.message).toEqual(
  //       `Cannot remove user with works pending payment`,
  //     );
  //   });
  // });

  // describe('users/remove/bulk (DELETE)', () => {
  //   it('should throw an exception for not sending a JWT to the protected path users/remove/bulk ', async () => {
  //     const response = await request
  //       .default(app.getHttpServer())
  //       .delete('/users/remove/bulk')
  //       .expect(401);
  //     expect(response.body.message).toEqual('Unauthorized');
  //   });

  //   it('It should throw an exception because the user JWT does not have permissions for this action users/remove/bulk ', async () => {
  //     await authService.removePermission(userTest.id, 'remove_bulk_users');
  //     const response = await request
  //       .default(app.getHttpServer())
  //       .delete('/users/remove/bulk')
  //       .set('Authorization', `Bearer ${token}`)
  //       .expect(403);
  //     expect(response.body.message).toEqual(
  //       `User ${userTest.first_name} need a permit for this action`,
  //     );
  //   });

  //   it('Should delete users bulk', async () => {
  //     await authService.addPermission(userTest.id, 'remove_bulk_users');
  //     // Crear useres de prueba
  //     const [user1, user2, user3] = await Promise.all([
  //       createTestUser({
  //         first_name: 'John 2',
  //         last_name: 'Doe',
  //         email: 'john.doefg2@example.com',
  //         cell_phone_number: '3007890123',
  //         address: '123 Main St',
  //       }),
  //       createTestUser({
  //         first_name: 'Jane4 2',
  //         last_name: 'Smith',
  //         email: 'jane.smith32@example.com',
  //         cell_phone_number: '3007890123',
  //         address: '456 Elm St',
  //       }),
  //       createTestUser({
  //         first_name: 'Jane 3',
  //         last_name: 'Smith',
  //         email: 'jane.smith35@example.com',
  //         cell_phone_number: '3007890123',
  //         address: '456 Elm St',
  //       }),
  //     ]);

  //     const bulkData: RemoveBulkRecordsDto<User> = {
  //       recordsIds: [{ id: user1.id }, { id: user2.id }],
  //     };

  //     await request
  //       .default(app.getHttpServer())
  //       .delete('/users/remove/bulk')
  //       .set('Authorization', `Bearer ${token}`)
  //       .send(bulkData)
  //       .expect(200);

  //     const [deletedUser1, deletedUser2, remainingUser3] =
  //       await Promise.all([
  //         userRepository.findOne({ where: { id: user1.id } }),
  //         userRepository.findOne({ where: { id: user2.id } }),
  //         userRepository.findOne({ where: { id: user3.id } }),
  //       ]);

  //     expect(deletedUser1).toBeNull();
  //     expect(deletedUser2).toBeNull();
  //     expect(remainingUser3).toBeDefined();
  //   });

  //   it('Should throw exception when trying to send an empty array.', async () => {
  //     const { body } = await request
  //       .default(app.getHttpServer())
  //       .delete('/users/remove/bulk')
  //       .set('Authorization', `Bearer ${token}`)
  //       .send({ recordsIds: [] })
  //       .expect(400);
  //     expect(body.message[0]).toEqual('recordsIds should not be empty');
  //   });

  //   it('Should throw an exception when trying to delete a user with sales pending payment.', async () => {
  //     // Crear usere de prueba
  //     const user1 = await createTestUser({
  //       first_name: 'User for sale 1',
  //       last_name: 'Doe',
  //       email: 'userforsale1@example.com',
  //       cell_phone_number: '3007890123',
  //       address: '123 Main St',
  //     });
  //     const user2 = await createTestUser({
  //       first_name: 'User for sale 2',
  //       last_name: 'Doe',
  //       email: 'userforsale2@example.com',
  //       cell_phone_number: '3007890123',
  //       address: '123 Main St',
  //     });
  //     const user3 = await createTestUser({
  //       first_name: 'User for sale 3',
  //       last_name: 'Doe',
  //       email: 'userforsale3@example.com',
  //       cell_phone_number: '3007890123',
  //       address: '123 Main St',
  //     });

  //     // Crear cultivo de prueba
  //     const crop = await cropService.create({
  //       name: `Crop for sale ${Math.random() * 100}`,
  //       description: 'Crop for sale',
  //       units: 10,
  //       location: 'Main St',
  //       date_of_creation: new Date().toISOString(),
  //     } as CreateCropDto);

  //     // Crear cosecha de prueba
  //     const harvestData = {
  //       date: new Date().toISOString(),
  //       crop: { id: crop.id },
  //       details: [
  //         { user: { id: user1.id }, total: 600, value_pay: 450000 },
  //       ],
  //       total: 600,
  //       value_pay: 450000,
  //       observation: 'description demo test creation harvest...',
  //     };

  //     await harvestService.create(harvestData as CreateHarvestDto);

  //     await workService.create({
  //       date: new Date().toISOString(),
  //       crop: { id: crop.id },
  //       details: [
  //         {
  //           user: { id: user2.id },
  //           value_pay: 1000,
  //           payment_is_pending: true,
  //         },
  //       ],
  //       total: 10,
  //       value_pay: 1000,
  //       description: 'description demo test creation harvest...',
  //     } as any);

  //     // Intentar eliminar el user
  //     const { body } = await request
  //       .default(app.getHttpServer())
  //       .delete(`/users/remove/bulk`)
  //       .set('Authorization', `Bearer ${token}`)
  //       .send({
  //         recordsIds: [
  //           { id: user1.id },
  //           { id: user2.id },
  //           { id: user3.id },
  //         ],
  //       })
  //       .expect(207);
  //     expect(body).toEqual({
  //       success: [user3.id],
  //       failed: [
  //         {
  //           id: user1.id,
  //           error: 'Cannot remove user with harvests pending payment',
  //         },
  //         {
  //           id: user2.id,
  //           error: 'Cannot remove user with works pending payment',
  //         },
  //       ],
  //     });
  //   });
  // });

  // TODO: Implementar pruebas para estos endpoints
  // TODO: pending-payments/all
  // TODO: made-payments/all
  // TODO: pending-payments/one/:id
  // TODO: harvests/all
  // TODO: works/all
  // TODO: find/certification/one/:id
  // TODO: find/top-users-in-harvests
  // TODO: find/top-users-in-works
});
