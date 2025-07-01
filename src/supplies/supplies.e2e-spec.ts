import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { Supply } from './entities/supply.entity';

import cookieParser from 'cookie-parser';
import { Administrator } from 'src/administrators/entities/administrator.entity';
import { ClientsModule } from 'src/clients/clients.module';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { RequestTools } from 'src/seed/helpers/RequestTools';
import { TenantDatabase } from 'src/tenants/entities/tenant-database.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { TenantMiddleware } from 'src/tenants/middleware/tenant.middleware';
import { TenantsModule } from 'src/tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.test',
      isGlobal: true,
    }),
    TenantsModule,
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
          database: 'cropco_management',
          entities: [Tenant, TenantDatabase, Administrator],
          synchronize: true,
          ssl: false,
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

describe('SuppliesController e2e', () => {
  let app: INestApplication;
  let seedService: SeedService;
  let authService: AuthService;
  let userTest: User;
  let token: string;
  let supplyRepository: Repository<Supply>;
  let reqTools: RequestTools;
  let tenantId: string;

  const supplyDtoTemplete: CreateSupplyDto = {
    name: 'Supply ' + InformationGenerator.generateRandomId(),
    brand: InformationGenerator.generateSupplyBrand(),
    unit_of_measure: InformationGenerator.generateUnitOfMeasure(),
    observation: InformationGenerator.generateObservation(),
  };

  const falseSupplyId = InformationGenerator.generateRandomId();

  const CreateSupply = async () => {
    const result = await reqTools.createSeedData({ supplies: 1 });
    return result.history.insertedSupplies[0];
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

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

    reqTools = new RequestTools({ moduleFixture });
    reqTools.setApp(app);
    await reqTools.initializeTenant();
    tenantId = reqTools.getTenantIdPublic();

    await reqTools.clearDatabaseControlled({ supplies: true });

    userTest = await reqTools.createTestUser();
    token = await reqTools.generateTokenUser();
  });

  afterAll(async () => {
    await reqTools.deleteTestUser();
    await app.close();
  });

  describe('supplies/create (POST)', () => {
    beforeAll(async () => {
      await reqTools.addActionForUser(userTest.id, 'create_supply');
    });

    it('should throw an exception for not sending a JWT to the protected path /supplies/create', async () => {
      const bodyRequest: CreateSupplyDto = {
        ...supplyDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/supplies/create')
        .send(bodyRequest)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should create a new supply', async () => {
      const bodyRequest: CreateSupplyDto = {
        ...supplyDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/supplies/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(201);

      expect(response.body).toMatchObject(bodyRequest);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'name must be longer than or equal to 4 characters',
        'name must be a string',
        'brand must be longer than or equal to 3 characters',
        'brand must be a string',
        'unit_of_measure must be one of the following values: GRAMOS, MILILITROS',
        'unit_of_measure must be a string',
        'observation must be longer than or equal to 10 characters',
        'observation must be a string',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/supplies/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });

    it('should throw exception for trying to create a supply with duplicate name.', async () => {
      const supplyWithSameName = await CreateSupply();

      const bodyRequest: CreateSupplyDto = {
        ...supplyDtoTemplete,
        name: supplyWithSameName.name,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .post('/supplies/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (name)=(${bodyRequest.name}) already exists.`,
      );
    });
  });

  describe('supplies/all (GET)', () => {
    beforeAll(async () => {
      try {
        await reqTools.clearDatabaseControlled({ supplies: true });
        await Promise.all(Array.from({ length: 17 }).map(() => CreateSupply()));
        await reqTools.addActionForUser(userTest.id, 'find_all_supplies');
      } catch (error) {
        console.log(error);
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /supplies/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/all')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only 10 supplies for default by not sending paging parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });
    it('should return all available records by sending the parameter all_records to true, ignoring other parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/all')
        .query({ all_records: true, limit: 10, offset: 1 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(17);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((supply: Supply) => {
        expect(supply).toHaveProperty('id');
        expect(supply).toHaveProperty('name');
        expect(supply).toHaveProperty('brand');
        expect(supply).toHaveProperty('unit_of_measure');
        expect(supply).toHaveProperty('observation');
        expect(supply).toHaveProperty('stock');
        expect(supply).toHaveProperty('createdDate');
        expect(supply).toHaveProperty('updatedDate');
        expect(supply).toHaveProperty('deletedDate');
        expect(supply.deletedDate).toBeNull();
      });
    });
    it('should return the specified number of supplies passed by the paging arguments by the URL', async () => {
      const response1 = await request
        .default(app.getHttpServer())
        .get(`/supplies/all`)
        .query({ limit: 11, offset: 0 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response1.body.total_row_count).toEqual(17);
      expect(response1.body.current_row_count).toEqual(11);
      expect(response1.body.total_page_count).toEqual(2);
      expect(response1.body.current_page_count).toEqual(1);
      response1.body.records.forEach((supply: Supply) => {
        expect(supply).toHaveProperty('id');
        expect(supply).toHaveProperty('name');
        expect(supply).toHaveProperty('brand');
        expect(supply).toHaveProperty('unit_of_measure');
        expect(supply).toHaveProperty('observation');
        expect(supply).toHaveProperty('stock');
        expect(supply).toHaveProperty('createdDate');
        expect(supply).toHaveProperty('updatedDate');
        expect(supply).toHaveProperty('deletedDate');
        expect(supply.deletedDate).toBeNull();
        expect(supply.deletedDate).toBeNull();
      });

      const response2 = await request
        .default(app.getHttpServer())
        .get(`/supplies/all`)
        .query({ limit: 11, offset: 1 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response2.body.total_row_count).toEqual(17);
      expect(response2.body.current_row_count).toEqual(6);
      expect(response2.body.total_page_count).toEqual(2);
      expect(response2.body.current_page_count).toEqual(2);
      response2.body.records.forEach((supply: Supply) => {
        expect(supply).toHaveProperty('id');
        expect(supply).toHaveProperty('name');
        expect(supply).toHaveProperty('brand');
        expect(supply).toHaveProperty('unit_of_measure');
        expect(supply).toHaveProperty('observation');
        expect(supply).toHaveProperty('stock');
        expect(supply).toHaveProperty('createdDate');
        expect(supply).toHaveProperty('updatedDate');
        expect(supply).toHaveProperty('deletedDate');
        expect(supply.deletedDate).toBeNull();
        expect(supply.deletedDate).toBeNull();
      });
    });
    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/supplies/all')
        .query({ offset: 10 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no supply records with the requested pagination',
      );
    });
  });

  describe('supplies/one/:id (GET)', () => {
    beforeAll(async () => {
      await reqTools.addActionForUser(userTest.id, 'find_one_supply');
    });

    it('should throw an exception for not sending a JWT to the protected path supplies/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/${falseSupplyId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get one supply', async () => {
      const { id } = await CreateSupply();

      const { body } = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('brand');
      expect(body).toHaveProperty('unit_of_measure');
      expect(body).toHaveProperty('observation');
      expect(body).toHaveProperty('stock');
      expect(body).toHaveProperty('createdDate');
      expect(body).toHaveProperty('updatedDate');
      expect(body).toHaveProperty('deletedDate');
      expect(body.deletedDate).toBeNull();
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/1234`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });
    it('should throw exception for not finding supply by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/${falseSupplyId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Supply with id: ${falseSupplyId} not found`,
      );
    });
    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('supplies/update/one/:id (PATCH)', () => {
    beforeAll(async () => {
      await reqTools.addActionForUser(userTest.id, 'update_one_supply');
    });

    it('should throw an exception for not sending a JWT to the protected path supplies/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/supplies/update/one/${falseSupplyId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should update one supply', async () => {
      const supplyDemo = await CreateSupply();

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/supplies/update/one/${supplyDemo.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({
          brand: 'Change brand supply',
          observation: 'Change observation supply',
        })
        .expect(200);

      expect(body.observation).toEqual('Change observation supply');
      expect(body.brand).toEqual('Change brand supply');
    });

    it('should throw exception for not finding supply to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/supplies/update/one/${falseSupplyId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ observation: 'New observation' })
        .expect(404);
      expect(body.message).toEqual(
        `Supply with id: ${falseSupplyId} not found`,
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/supplies/update/one/${falseSupplyId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
    it('should throw exception for trying to update the name for one that is in use.', async () => {
      const supplyWithSameName = await CreateSupply();
      const { id } = await CreateSupply();

      const bodyRequest = {
        name: supplyWithSameName.name,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/supplies/update/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (name)=(${bodyRequest.name}) already exists.`,
      );
    });
  });

  describe('supplies/remove/one/:id (DELETE)', () => {
    beforeAll(async () => {
      await reqTools.addActionForUser(userTest.id, 'remove_one_supply');
    });

    it('should throw an exception for not sending a JWT to the protected path supplies/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/supplies/remove/one/${falseSupplyId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete one supply', async () => {
      const supplyDemo = await CreateSupply();

      await request
        .default(app.getHttpServer())
        .delete(`/supplies/remove/one/${supplyDemo.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      // const { notFound } = await request
      //   .default(app.getHttpServer())
      //   .get(`/supplies/one/${supplyDemo.id}`)
      //   .set('x-tenant-id', tenantId)
      //   .set('Cookie', `user-token=${token}`)
      //   .expect(404);
      // expect(notFound).toBe(true);
    });

    it('You should throw exception for trying to delete a supply that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/supplies/remove/one/${falseSupplyId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Supply with id: ${falseSupplyId} not found`,
      );
    });

    it('should throw an exception when trying to delete a supply with stock available', async () => {
      const response = await reqTools.createSeedData({
        shoppings: { variant: 'normal', quantity: 1 },
      });

      const supply = response.history.insertedShoppingSupplies[0].supply;

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/supplies/remove/one/${supply.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(409);
      expect(body.message).toEqual(
        `Supply with id ${supply.id} has stock available`,
      );
    });
  });

  describe('supplies/remove/bulk (DELETE)', () => {
    beforeAll(async () => {
      await reqTools.addActionForUser(userTest.id, 'remove_bulk_supplies');
    });

    it('should throw an exception for not sending a JWT to the protected path supplies/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/supplies/remove/bulk')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete supplies bulk', async () => {
      const [supply1, supply2, supply3] = await Promise.all([
        CreateSupply(),
        CreateSupply(),
        CreateSupply(),
      ]);

      const bulkData: RemoveBulkRecordsDto<Supply> = {
        recordsIds: [{ id: supply1.id }, { id: supply2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/supplies/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bulkData)
        .expect(200);

      // const [deletedClient1, deletedClient2, remainingClient3] =
      //   await Promise.all([
      //     supplyRepository.findOne({ where: { id: supply1.id } }),
      //     supplyRepository.findOne({ where: { id: supply2.id } }),
      //     supplyRepository.findOne({ where: { id: supply3.id } }),
      //   ]);

      // expect(deletedClient1).toBeNull();
      // expect(deletedClient2).toBeNull();
      // expect(remainingClient3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/supplies/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });

    it('should throw an exception when trying to delete a supply with stock available.', async () => {
      const {
        history: { insertedShoppingSupplies },
      } = await reqTools.createSeedData({
        shoppings: { variant: 'normal', quantity: 2 },
      });

      const [{ supply: supply1 }, { supply: supply2 }] =
        insertedShoppingSupplies;

      const supply3 = await CreateSupply();
      // const [supply1, supply2, supply3] = await Promise.all([
      //   CreateSupply(),
      //   CreateSupply(),
      //   CreateSupply(),
      // ]);

      // await seedService.CreateShopping({ supplyId: supply1.id });
      // await seedService.CreateShopping({ supplyId: supply2.id });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/supplies/remove/bulk`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({
          recordsIds: [
            { id: supply1.id },
            { id: supply2.id },
            { id: supply3.id },
          ],
        })
        .expect(207);
      expect(body).toEqual({
        success: [supply3.id],
        failed: [
          {
            id: supply1.id,
            error: `Supply with id ${supply1.id} has stock available`,
          },
          {
            id: supply2.id,
            error: `Supply with id ${supply2.id} has stock available`,
          },
        ],
      });
    });
  });

  describe('supplies/shopping/all (GET)', () => {
    beforeAll(async () => {
      await reqTools.clearDatabaseControlled({ supplies: true });
      await reqTools.addActionForUser(
        userTest.id,
        'find_all_supplies_with_shopping',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path /supplies/shopping/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/shopping/all')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should obtain all supplies that have purchases', async () => {
      await reqTools.createSeedData({
        shoppings: { variant: 'normal', quantity: 3 },
      });

      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/shopping/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(3);
      expect(response.body.current_row_count).toEqual(3);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);
      // await authService.removePermission(
      //   userTest.id,
      //   'find_all_supplies_with_shopping',
      // );
    });
  });

  describe('supplies/consumptions/all (GET)', () => {
    beforeAll(async () => {
      await reqTools.clearDatabaseControlled({ supplies: true });
      await reqTools.addActionForUser(
        userTest.id,
        'find_all_supplies_with_consumptions',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path /supplies/consumptions/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/consumptions/all')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should obtain all supplies that have consumptions', async () => {
      const responseSupplies = await reqTools.createSeedData({
        shoppings: { quantity: 2, variant: 'normal' },
      });

      const [{ supply: supply1 }, { supply: supply2 }] =
        responseSupplies.history.insertedShoppingSupplies;

      await reqTools.createSeedData({
        consumptions: { quantity: 1, variant: 'normal', supplyId: supply1.id },
      });
      await reqTools.createSeedData({
        consumptions: { quantity: 1, variant: 'normal', supplyId: supply2.id },
      });

      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/consumptions/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(2);
      expect(response.body.current_row_count).toEqual(2);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);
    });
  });

  describe('supplies/stock/all (GET)', () => {
    beforeAll(async () => {
      await reqTools.clearDatabaseControlled({ supplies: true });
      await reqTools.addActionForUser(
        userTest.id,
        'find_all_supplies_with_stock',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path /supplies/stock/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/stock/all')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should obtain all supplies that have purchases', async () => {
      await Promise.all([
        reqTools.createSeedData({ shoppings: { quantity: 1 } }),
        reqTools.createSeedData({ shoppings: { quantity: 1 } }),
        reqTools.createSeedData({ shoppings: { quantity: 1 } }),
      ]);

      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/stock/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(3);
      expect(response.body.current_row_count).toEqual(3);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);
    });
  });

  describe('should throw an exception because the user JWT does not have permissions for these actions', () => {
    beforeAll(async () => {
      await Promise.all([
        reqTools.removePermissionFromUser(userTest.id, 'create_supply'),
        reqTools.removePermissionFromUser(userTest.id, 'find_all_supplies'),
        reqTools.removePermissionFromUser(userTest.id, 'find_one_supply'),
        reqTools.removePermissionFromUser(userTest.id, 'update_one_supply'),
        reqTools.removePermissionFromUser(userTest.id, 'remove_one_supply'),
        reqTools.removePermissionFromUser(userTest.id, 'remove_bulk_supplies'),
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_all_supplies_with_shopping',
        ),
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_all_supplies_with_consumptions',
        ),
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_all_supplies_with_stock',
        ),
      ]);
    });
    it('should throw an exception because the user JWT does not have permissions for this action /supplies/create', async () => {
      const bodyRequest: CreateSupplyDto = {
        ...supplyDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/supplies/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /supplies/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action supplies/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/${falseSupplyId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action supplies/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/supplies/update/one/${falseSupplyId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action supplies/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/supplies/remove/one/${falseSupplyId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action supplies/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/supplies/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /supplies/shopping/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/shopping/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /supplies/consumptions/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/consumptions/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /supplies/stock/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/stock/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });
});
