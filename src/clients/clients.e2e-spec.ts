import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { describe } from 'node:test';
import { CommonModule } from 'src/common/common.module';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Repository } from 'typeorm';
import { ClientsModule } from './clients.module';
import { CreateClientDto } from './dto/create-client.dto';
import { Client } from './entities/client.entity';

describe('ClientsController (e2e)', () => {
  let app: INestApplication;
  let clientRepository: Repository<Client>;

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
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    clientRepository = moduleFixture.get<Repository<Client>>(
      getRepositoryToken(Client),
    );
  });

  afterEach(async () => {
    await clientRepository.delete({});
  });

  afterAll(async () => {
    await app.close();
  });

  async function createTestClient(data: CreateClientDto) {
    const client = clientRepository.create(data);
    return await clientRepository.save(client);
  }

  describe('/clients/create (POST)', () => {
    it('should create a new client', async () => {
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
        .expect(201);
      expect(response.body).toMatchObject(data);
    });
  });

  describe('clients/all (GET)', () => {
    it('Should get all clients', async () => {
      // Crear clientes de prueba

      await Promise.all([
        createTestClient({
          first_name: 'John 2',
          last_name: 'Doe',
          email: 'john.doe2@example.com',
          cell_phone_number: '3007890123',
          address: '123 Main St',
        }),

        createTestClient({
          first_name: 'Jane 2',
          last_name: 'Smith',
          email: 'jane.smith2@example.com',
          cell_phone_number: '3007890123',
          address: '456 Elm St',
        }),
      ]);

      const response = await request
        .default(app.getHttpServer())
        .get('/clients/all')
        .expect(200);
      expect(response.body.rows.length).toEqual(2);
    });
  });

  // TODO: Implementar prueba de GET /clients/sales/all
  // describe('clients/sales/all (GET)', () => {
  //   it('Should get all clients with sales', async () => {
  //     // Crear un cliente con ventas de prueba
  //     const response = await request
  //       .default(app.getHttpServer())
  //       .get('/clients/sales/all')
  //       .expect(200);
  //     console.log(response.body);
  //     expect(response.body.rows.length).toBeGreaterThan(1);
  //   });
  // });

  describe('clients/one/:id (GET)', () => {
    it('Should get one client', async () => {
      // Crear un cliente de prueba
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
        .expect(200);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('clients/update/one/:id (PATCH)', () => {
    it('Should update one client', async () => {
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
        .send({ first_name: 'John 4' })
        .expect(200);

      expect(body.first_name).toEqual('John 4');
    });
  });
  describe('clients/remove/one/:id (DELETE)', () => {
    it('Should delete one client', async () => {
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
        .expect(200);

      const { notFound } = await request
        .default(app.getHttpServer())
        .get(`/clients/one/${id}`)
        .expect(404);
      expect(notFound).toBe(true);
    });
  });

  describe('clients/export/all/pdf (GET)', () => {
    it('Should export all clients in PDF format', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/clients/export/all/pdf')
        .expect(200);
      expect(body).toBeDefined();
    });
  });

  describe('clients/remove/bulk (DELETE)', () => {
    it('Should delete clients bulk', async () => {
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
  });

  // TODO: Implementar prueba de GET top clients by sales
});
