import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { describe } from 'node:test';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { ClientsModule } from './clients.module';
import { CreateClientDto } from './dto/create-client.dto';
import { Client } from './entities/client.entity';

describe('ClientsController (e2e)', () => {
  let app: INestApplication;
  let clientRepository: Repository<Client>;
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
        ClientsModule,
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

    clientRepository = moduleFixture.get<Repository<Client>>(
      getRepositoryToken(Client),
    );

    await clientRepository.delete({});
    userTest = await authService.createUserToTests();
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await app.close();
  });

  async function createTestClient(data: CreateClientDto) {
    const client = clientRepository.create(data);
    return await clientRepository.save(client);
  }

  describe('/clients/create (POST)', () => {
    it('should throw an exception for not sending a JWT to the protected path /clients/create', async () => {
      const data: CreateClientDto = {
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/clients/create')
        .send(data)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('It should throw an exception because the user JWT does not have permissions for this action /clients/create', async () => {
      await authService.removePermission(userTest.id, 'create_client');

      const data: CreateClientDto = {
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/clients/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should create a new client', async () => {
      await authService.addPermission(userTest.id, 'create_client');

      const data: CreateClientDto = {
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/clients/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(201);
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
        'cell_phone_number must be shorter than or equal to 10 characters',
        'cell_phone_number must be a number string',
        'address must be shorter than or equal to 200 characters',
        'address must be a string',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/clients/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });

    it('Should throw exception for trying to create a client with duplicate email.', async () => {
      await createTestClient({
        first_name: 'Stiven',
        last_name: 'Gomez',
        email: 'Stiven@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      });

      const data: CreateClientDto = {
        first_name: 'David',
        last_name: 'Gomez',
        email: 'Stiven@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };
      const { body } = await request
        .default(app.getHttpServer())
        .post('/clients/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(400);
      expect(body.message).toEqual(
        'Unique constraint violation, Key (email)=(Stiven@gmail.com) already exists.',
      );
    });
  });

  describe('clients/all (GET)', () => {
    beforeAll(async () => {
      await clientRepository.delete({});
      const result = await seedService.insertNewClients();
      if (result) {
        console.log('Inserted 17 client records for testing');
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /clients/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('It should throw an exception because the user JWT does not have permissions for this action /clients/all', async () => {
      await authService.removePermission(userTest.id, 'find_all_clients');
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get only 10 clients for default by not sending paging parameters', async () => {
      await authService.addPermission(userTest.id, 'find_all_clients');
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });
    it('should return all available records by sending the parameter all_records to true, ignoring other parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/all?all_records=true&&limit=10&&offset=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(17);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);
      response.body.records.forEach((client: Client) => {
        expect(client).toHaveProperty('id');
        expect(client).toHaveProperty('first_name');
        expect(client).toHaveProperty('last_name');
        expect(client).toHaveProperty('email');
        expect(client).toHaveProperty('cell_phone_number');
        expect(client).toHaveProperty('address');
        expect(client).toHaveProperty('createdDate');
        expect(client).toHaveProperty('updatedDate');
        expect(client).toHaveProperty('deletedDate');
        expect(client.deletedDate).toBeNull();
      });
    });
    it('should return the specified number of clients passed by the paging arguments by the URL', async () => {
      let limit = 11;
      let offset = 0;
      const response1 = await request
        .default(app.getHttpServer())
        .get(`/clients/all?limit=${limit}&&offset=${offset}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response1.body.total_row_count).toEqual(17);
      expect(response1.body.current_row_count).toEqual(limit);
      expect(response1.body.total_page_count).toEqual(2);
      expect(response1.body.current_page_count).toEqual(1);
      response1.body.records.forEach((client: Client) => {
        expect(client).toHaveProperty('id');
        expect(client).toHaveProperty('first_name');
        expect(client).toHaveProperty('last_name');
        expect(client).toHaveProperty('email');
        expect(client).toHaveProperty('cell_phone_number');
        expect(client).toHaveProperty('address');
        expect(client).toHaveProperty('createdDate');
        expect(client).toHaveProperty('updatedDate');
        expect(client).toHaveProperty('deletedDate');
        expect(client.deletedDate).toBeNull();
      });

      offset = 1;
      const response2 = await request
        .default(app.getHttpServer())
        .get(`/clients/all?limit=${limit}&&offset=${offset}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response2.body.total_row_count).toEqual(17);
      expect(response2.body.current_row_count).toEqual(6);
      expect(response2.body.total_page_count).toEqual(2);
      expect(response2.body.current_page_count).toEqual(2);
      response2.body.records.forEach((client: Client) => {
        expect(client).toHaveProperty('id');
        expect(client).toHaveProperty('first_name');
        expect(client).toHaveProperty('last_name');
        expect(client).toHaveProperty('email');
        expect(client).toHaveProperty('cell_phone_number');
        expect(client).toHaveProperty('address');
        expect(client).toHaveProperty('createdDate');
        expect(client).toHaveProperty('updatedDate');
        expect(client).toHaveProperty('deletedDate');
        expect(client.deletedDate).toBeNull();
      });
    });
    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/clients/all?offset=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no client records with the requested pagination',
      );
    });
  });

  describe('clients/one/:id (GET)', () => {
    const clientId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path clients/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/clients/one/${clientId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('It should throw an exception because the user JWT does not have permissions for this action clients/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_client');
      const response = await request
        .default(app.getHttpServer())
        .get(`/clients/one/${clientId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('Should get one client', async () => {
      // Crear un cliente de prueba
      await authService.addPermission(userTest.id, 'find_one_client');
      const { id } = await createTestClient({
        first_name: 'John 3',
        last_name: 'Doe',
        email: 'john.doe3@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });

      const response = await request
        .default(app.getHttpServer())
        .get(`/clients/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('first_name');
      expect(response.body).toHaveProperty('last_name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('cell_phone_number');
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('sales_detail');
      expect(response.body.sales_detail).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('createdDate');
      expect(response.body).toHaveProperty('updatedDate');
      expect(response.body).toHaveProperty('deletedDate');
      expect(response.body.deletedDate).toBeNull();
    });

    it('Should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/clients/one/1234`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });
    it('Should throw exception for not finding client by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/clients/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Client with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });
    it('Should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/clients/one/`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('clients/update/one/:id (PATCH)', () => {
    const clientId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path clients/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/clients/update/one/${clientId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('It should throw an exception because the user JWT does not have permissions for this action clients/update/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_client');
      const response = await request
        .default(app.getHttpServer())
        .patch(`/clients/update/one/${clientId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('Should update one client', async () => {
      await authService.addPermission(userTest.id, 'update_one_client');
      const { id } = await createTestClient({
        first_name: 'John 3.5',
        last_name: 'Doe',
        email: 'john.doe3.5@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/clients/update/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ first_name: 'John 4', last_name: 'Doe 4' })
        .expect(200);

      expect(body.first_name).toEqual('John 4');
      expect(body.last_name).toEqual('Doe 4');
      expect(body.email).toEqual('john.doe3.5@example.com');
      expect(body.cell_phone_number).toEqual('3007890123');
      expect(body.address).toEqual('123 Main St');
    });

    it('Should throw exception for not finding client to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/clients/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ first_name: 'John 4' })
        .expect(404);
      expect(body.message).toEqual(
        'Client with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('Should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/clients/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
    it('It should throw exception for trying to update the email for one that is in use.', async () => {
      const { id } = await createTestClient({
        first_name: 'Alan',
        last_name: 'Demo',
        email: 'alandemo@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/clients/update/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'john.doe3.5@example.com' })
        .expect(400);
      expect(body.message).toEqual(
        'Unique constraint violation, Key (email)=(john.doe3.5@example.com) already exists.',
      );
    });
  });

  describe('clients/remove/one/:id (DELETE)', () => {
    const clientId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path clients/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/clients/remove/one/${clientId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('It should throw an exception because the user JWT does not have permissions for this action clients/remove/one/:id', async () => {
      await authService.removePermission(userTest.id, 'remove_one_client');
      const response = await request
        .default(app.getHttpServer())
        .delete(`/clients/remove/one/${clientId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('Should delete one client', async () => {
      await authService.addPermission(userTest.id, 'remove_one_client');
      const { id } = await createTestClient({
        first_name: 'Ana 4.5',
        last_name: 'Doe',
        email: 'Ana.doe4.5@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });

      await request
        .default(app.getHttpServer())
        .delete(`/clients/remove/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const { notFound } = await request
        .default(app.getHttpServer())
        .get(`/clients/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(notFound).toBe(true);
    });
    it('You should throw exception for trying to delete a client that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/clients/remove/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Client with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    // TODO: Implementar prueba de eliminación de cliente con ventas con pago pendiente
  });

  describe('clients/export/all/pdf (GET)', () => {
    it('should throw an exception for not sending a JWT to the protected path clients/export/all/pdf', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/export/all/pdf')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('It should throw an exception because the user JWT does not have permissions for this action clients/export/all/pdf', async () => {
      await authService.removePermission(userTest.id, 'export_clients_pdf');
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/export/all/pdf')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('Should export all clients in PDF format', async () => {
      await authService.addPermission(userTest.id, 'export_clients_pdf');
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/export/all/pdf')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toBeDefined();
      expect(response.headers['content-type']).toEqual('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });

  describe('clients/remove/bulk (DELETE)', () => {
    it('should throw an exception for not sending a JWT to the protected path clients/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/clients/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('It should throw an exception because the user JWT does not have permissions for this action clients/remove/bulk ', async () => {
      await authService.removePermission(userTest.id, 'remove_bulk_clients');
      const response = await request
        .default(app.getHttpServer())
        .delete('/clients/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('Should delete clients bulk', async () => {
      await authService.addPermission(userTest.id, 'remove_bulk_clients');
      // Crear clientes de prueba
      const [client1, client2, client3] = await Promise.all([
        createTestClient({
          first_name: 'John 2',
          last_name: 'Doe',
          email: 'john.doefg2@example.com',
          cell_phone_number: '3007890123',
          address: '123 Main St',
        }),
        createTestClient({
          first_name: 'Jane4 2',
          last_name: 'Smith',
          email: 'jane.smith32@example.com',
          cell_phone_number: '3007890123',
          address: '456 Elm St',
        }),
        createTestClient({
          first_name: 'Jane 3',
          last_name: 'Smith',
          email: 'jane.smith35@example.com',
          cell_phone_number: '3007890123',
          address: '456 Elm St',
        }),
      ]);

      const bulkData: RemoveBulkRecordsDto<Client> = {
        recordsIds: [{ id: client1.id }, { id: client2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/clients/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(bulkData)
        .expect(200);

      const [deletedClient1, deletedClient2, remainingClient3] =
        await Promise.all([
          clientRepository.findOne({ where: { id: client1.id } }),
          clientRepository.findOne({ where: { id: client2.id } }),
          clientRepository.findOne({ where: { id: client3.id } }),
        ]);

      expect(deletedClient1).toBeNull();
      expect(deletedClient2).toBeNull();
      expect(remainingClient3).toBeDefined();
    });

    it('You should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/clients/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });

    // TODO: Implementar prueba de eliminación de clientes con ventas con pago pendiente
  });

  // TODO: Implementar prueba de GET /clients/sales/all
  // TODO: Implementar prueba de GET top clients by sales
});
