import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ClientsModule } from './clients.module';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { CommonModule } from 'src/common/common.module';
import { describe } from 'node:test';
import { UpdateClientDto } from './dto/update-client.dto';

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

  afterAll(async () => {
    await app.close();
  });

  describe('/clients/create (POST)', () => {
    it('should create a new client', async () => {
      const createClientDto: CreateClientDto = {
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/clients/create')
        .send(createClientDto)
        .expect(201);

      expect(response.body).toMatchObject(createClientDto);
      await clientRepository.delete({ id: response.body.id });
    });
  });

  describe('clients/all (GET)', () => {
    it('Should get all clients', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/all')
        .expect(200);
      expect(response.body.rows.length).toBeGreaterThan(1);
    });
  });

  describe('clients/sales/all (GET)', () => {
    it('Should get all clients with sales', async () => {
      // Crear un cliente con ventas de prueba
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/sales/all')
        .expect(200);
      // console.log(response.body);
      // expect(response.body.rows.length).toBeGreaterThan(1);
    });
  });

  describe('clients/one/:id (GET)', () => {
    it('Should get one client', async () => {
      // const client = await clientRepository.findOneBy({id: 'bc3a0bfb-29cb-459f-a5e1-b0996581e645'});
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/one/bc3a0bfb-29cb-459f-a5e1-b0996581e645')
        .expect(200);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('clients/update/one/:id (PATCH)', () => {
    it('Should get one client', async () => {
      const dataClientDto: UpdateClientDto = {
        first_name: 'Tendras otro nombre',
      };
      const response = await request
        .default(app.getHttpServer())
        .patch('/clients/update/one/bc3a0bfb-29cb-459f-a5e1-b0996581e645')
        .send(dataClientDto)
        .expect(200);
      console.log(response.body)  
      // expect(response.body).toHaveProperty('id');
    });
  });
});
