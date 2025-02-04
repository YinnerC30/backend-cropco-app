import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import { Repository } from 'typeorm';
import { ClientsModule } from './clients.module';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';

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
        first_name: 'eljajas',
        email: 'eljajajs@example.com',
        last_name: 'joa',
        cell_phone_number: '3146652134',
        address: 'sdfsdfsdfsdfsdfds',
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/clients/create')
        .send(createClientDto)
        .expect(201);

      expect(response.body).toMatchObject(createClientDto);
    });
  });

  // describe('/clients (GET)', () => {
  //   it('should return a list of clients', async () => {
  //     // const createClientDto: CreateClientDto = {
  //     //   first_name: 'John',
  //     //   email: 'john@example.com',
  //     //   last_name: 'Chilito',
  //     //   cell_phone_number: '3146652134',
  //     //   address: 'sdfsdfsdfsdfsdfds',
  //     // };
  //     // await clientRepository.save(createClientDto);

  //     const response = await request
  //       .default(app.getHttpServer())
  //       .get('/clients/all')
  //       .expect(200);

  //     // expect(response.body).toEqual(
  //     //   expect.objectContaining({
  //     //     rowCount: 1,
  //     //     rows: [expect.objectContaining(createClientDto)],
  //     //   }),
  //     // );
  //   });
  // });
});
