import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { Client } from 'src/clients/entities/client.entity';
import { CommonModule } from 'src/common/common.module';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { Crop } from 'src/crops/entities/crop.entity';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { SaleDetailsDto } from './dto/sale-details.dto';
import { SaleDto } from './dto/sale.dto';
import { SaleDetails } from './entities/sale-details.entity';
import { Sale } from './entities/sale.entity';
import { SalesController } from './sales.controller';
import { SalesModule } from './sales.module';
import { Administrator } from 'src/administrators/entities/administrator.entity';
import { TenantDatabase } from 'src/tenants/entities/tenant-database.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { TenantMiddleware } from 'src/tenants/middleware/tenant.middleware';
import { TenantsModule } from 'src/tenants/tenants.module';
import { WorkModule } from 'src/work/work.module';
import cookieParser from 'cookie-parser';
import { RequestTools } from 'src/seed/helpers/RequestTools';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.test',
      isGlobal: true,
    }),
    TenantsModule,
    WorkModule,
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

describe('SalesController (e2e)', () => {
  let app: INestApplication;
  let saleRepository: Repository<Sale>;
  let saleDetailsRepository: Repository<SaleDetails>;
  let seedService: SeedService;
  let authService: AuthService;

  let saleController: SalesController;
  let userTest: User;
  let token: string;

  let reqTools: RequestTools;
  let tenantId: string;

  const saleDtoTemplete: SaleDto = {
    date: InformationGenerator.generateRandomDate({}),
    amount: 150,
    value_pay: 90_000,
    details: [
      {
        client: { id: InformationGenerator.generateRandomId() },
        crop: { id: InformationGenerator.generateRandomId() },
        amount: 150,
        value_pay: 90_000,
        is_receivable: true,
        unit_of_measure: 'GRAMOS',
      } as SaleDetailsDto,
    ],
  };

  const falseSaleId = InformationGenerator.generateRandomId();

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

    await reqTools.clearDatabaseControlled({ sales: true });

    userTest = await reqTools.createTestUser();
    token = await reqTools.generateTokenUser();
  });

  afterAll(async () => {
    await reqTools.deleteTestUser();
    await app.close();
  });

  describe('sales/create (POST)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('create_sale');
    });

    it('should throw an exception for not sending a JWT to the protected path /sales/create', async () => {
      const bodyRequest: SaleDto = {
        ...saleDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/sales/create')
        .send(bodyRequest)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should create a new sale', async () => {
      const client1 = await reqTools.CreateClient();
      const client2 = await reqTools.CreateClient();

      const { harvest, crop } = await reqTools.CreateHarvest({
        quantityEmployees: 15,
        amount: 2500,
      });

      await reqTools.CreateHarvestProcessed({
        cropId: crop.id,
        harvestId: harvest.id,
        amount: 1500,
      });

      const bodyRequest: SaleDto = {
        ...saleDtoTemplete,
        amount: 200,
        value_pay: 120_000,
        details: [
          {
            crop: { id: crop.id },
            client: { id: client1.id },
            amount: 100,
            value_pay: 60_000,
            is_receivable: false,
            unit_of_measure: 'GRAMOS',
          } as SaleDetailsDto,
          {
            crop: { id: crop.id },
            client: { id: client2.id },
            amount: 100,
            value_pay: 60_000,
            is_receivable: false,
            unit_of_measure: 'GRAMOS',
          } as SaleDetailsDto,
        ],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .post('/sales/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(201);

      expect(body).toMatchObject(bodyRequest);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'date must be a valid ISO 8601 date string',
        "El valor de 'amount' debe coincidir con la suma de las cantidades en 'details' convertidas a GRAMOS.",
        'amount must be a positive number',
        'amount must be a number conforming to the specified constraints',
        "The sum of fields [value_pay] in 'details' must match the corresponding top-level values.",
        'value_pay must be a positive number',
        'value_pay must be a number conforming to the specified constraints',
        'details should not be empty',
        'details must be an array',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/sales/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });
  });

  describe('sales/all (GET)', () => {
    let client1: Client;
    let client2: Client;
    let crop1: Crop;
    let crop2: Crop;

    beforeAll(async () => {
      await reqTools.clearDatabaseControlled({ sales: true });
      await reqTools.addActionToUser('create_sale');

      client1 = (await reqTools.CreateClient()) as Client;
      client2 = (await reqTools.CreateClient()) as Client;

      const { harvest: harvest1, crop: cropHarvest1 } =
        await reqTools.CreateHarvest({
          quantityEmployees: 20,
          amount: 15_000,
        });

      crop1 = cropHarvest1;

      await reqTools.CreateHarvestProcessed({
        cropId: cropHarvest1.id,
        harvestId: harvest1.id,
        amount: 6000,
      });

      const { harvest: harvest2, crop: cropHarvest2 } =
        await reqTools.CreateHarvest({
          quantityEmployees: 20,
          amount: 15_000,
        });

      crop2 = cropHarvest2;

      await reqTools.CreateHarvestProcessed({
        cropId: cropHarvest2.id,
        harvestId: harvest2.id,
        amount: 6000,
      });

      const data1: SaleDto = {
        date: InformationGenerator.generateRandomDate({}),
        amount: 100,
        value_pay: 60_000,
        details: [
          {
            crop: { id: crop1.id },
            client: { id: client1.id },
            amount: 100,
            value_pay: 60_000,
            is_receivable: false,
            unit_of_measure: 'GRAMOS',
          } as SaleDetailsDto,
        ],
      };

      const data2: SaleDto = {
        date: InformationGenerator.generateRandomDate({ daysToAdd: 5 }),
        amount: 150,
        value_pay: 90_000,
        details: [
          {
            crop: { id: crop1.id },
            client: { id: client1.id },
            amount: 150,
            value_pay: 90_000,
            is_receivable: false,
            unit_of_measure: 'GRAMOS',
          } as SaleDetailsDto,
        ],
      };

      const data3: SaleDto = {
        date: InformationGenerator.generateRandomDate({ daysToAdd: 10 }),
        amount: 300,
        value_pay: 180_000,
        details: [
          {
            crop: { id: crop2.id },
            client: { id: client2.id },
            amount: 300,
            value_pay: 180_000,
            is_receivable: false,
            unit_of_measure: 'GRAMOS',
          } as SaleDetailsDto,
        ],
      };

      for (let i = 0; i < 6; i++) {
        await Promise.all([
          request
            .default(app.getHttpServer())
            .post('/sales/create')
            .set('x-tenant-id', tenantId)
            .set('Cookie', `user-token=${token}`)
            .send(data1),
          request
            .default(app.getHttpServer())
            .post('/sales/create')
            .set('x-tenant-id', tenantId)
            .set('Cookie', `user-token=${token}`)
            .send(data2),
          request
            .default(app.getHttpServer())
            .post('/sales/create')
            .set('x-tenant-id', tenantId)
            .set('Cookie', `user-token=${token}`)
            .send(data3),
        ]);
      }
      await reqTools.addActionToUser('find_all_sales');
    }, 15_000);

    it('should throw an exception for not sending a JWT to the protected path /sales/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/sales/all')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only 10 sales for default by not sending paging parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/sales/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });

    it('should return the specified number of sales passed by the paging arguments by the URL (1)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query({ limit: 11, offset: 0 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(11);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of sales passed by the paging arguments by the URL (2)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query({ limit: 11, offset: 1 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(7);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(2);
      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
        });
      });
    });

    it('should return the specified number of sales passed by the query (includes crop 1)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query({ crops: crop1.id })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
          const flatCrops = sale.details.map((detail) => detail.crop.id);
          expect(flatCrops).toContain(crop1.id);
        });
      });
    });

    it('should return the specified number of sales passed by the query (includes crop 2)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query({ crops: crop2.id })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
          const flatCrops = sale.details.map((detail) => detail.crop.id);
          expect(flatCrops).toContain(crop2.id);
        });
      });
    });

    it('should return the specified number of sales passed by the query (includes client 1)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query({ clients: client1.id })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(detail).toHaveProperty('crop');
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client.id).toBe(client1.id);
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');

          const flatClients = sale.details.map((detail) => detail.client.id);
          expect(flatClients).toContain(client1.id);
        });
      });
    });

    it('should return the specified number of sales passed by the query (includes client 2)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query({ clients: client2.id })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail.client.id).toBe(client2.id);
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(detail).toHaveProperty('crop');
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
          const flatClients = sale.details.map((detail) => detail.client.id);
          expect(flatClients).toContain(client2.id);
        });
      });
    });

    it('should return the specified number of sales passed by the query (after date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.AFTER,
        date: InformationGenerator.generateRandomDate({}),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(new Date(sale.date) > new Date(queryData.date)).toBe(true);
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(sale.deletedDate).toBeNull();
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of sales passed by the query (before date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.BEFORE,
        date: InformationGenerator.generateRandomDate({ daysToAdd: 1 }),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(new Date(sale.date) < new Date(queryData.date)).toBe(true);
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(sale.deletedDate).toBeNull();
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of sales passed by the query (equal date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.EQUAL,
        date: InformationGenerator.generateRandomDate({ daysToAdd: 5 }),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale.date.split('T')[0]).toBe(
          new Date(queryData.date).toISOString().split('T')[0],
        );
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(sale.deletedDate).toBeNull();
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of sales passed by the query (equal amount)', async () => {
      const queryData = {
        filter_by_amount: true,
        type_filter_amount: TypeFilterNumber.EQUAL,
        type_unit_of_measure: 'GRAMOS',
        amount: 100,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale.amount).toBe(queryData.amount);
        expect(sale).toHaveProperty('value_pay');
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(sale.deletedDate).toBeNull();
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of sales passed by the query (max amount)', async () => {
      const queryData = {
        filter_by_amount: true,
        type_filter_amount: TypeFilterNumber.GREATER_THAN,
        type_unit_of_measure: 'GRAMOS',
        amount: 100,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale.amount).toBeGreaterThan(queryData.amount);
        expect(sale).toHaveProperty('value_pay');
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(sale.deletedDate).toBeNull();
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of sales passed by the query (min amount)', async () => {
      const queryData = {
        filter_by_amount: true,
        type_filter_amount: TypeFilterNumber.LESS_THAN,
        type_unit_of_measure: 'GRAMOS',
        amount: 300,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale.amount).toBeLessThan(queryData.amount);
        expect(sale).toHaveProperty('value_pay');
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(sale.deletedDate).toBeNull();
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of sales passed by the query (equal value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.EQUAL,
        value_pay: 60_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale.value_pay).toBe(queryData.value_pay);
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(sale.deletedDate).toBeNull();
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of sales passed by the query (max value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.GREATER_THAN,
        value_pay: 60_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale.value_pay).toBeGreaterThan(queryData.value_pay);
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(sale.deletedDate).toBeNull();
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of sales passed by the query (min value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.LESS_THAN,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale.value_pay).toBeLessThan(queryData.value_pay);
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();

        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of sales passed by the query (value_pay and crop 1)', async () => {
      const queryData = {
        crops: crop1.id,
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.LESS_THAN,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((sale: Sale) => {
        expect(sale).toHaveProperty('id');
        expect(sale).toHaveProperty('date');
        expect(sale).toHaveProperty('amount');
        expect(sale).toHaveProperty('value_pay');
        expect(sale.value_pay).toBeLessThan(queryData.value_pay);
        expect(sale).toHaveProperty('createdDate');
        expect(sale).toHaveProperty('updatedDate');
        expect(sale).toHaveProperty('deletedDate');
        expect(sale.deletedDate).toBeNull();
        expect(sale.deletedDate).toBeNull();
        expect(sale).toHaveProperty('details');
        expect(sale.details.length).toBeGreaterThan(0);
        sale.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('is_receivable');
          expect(sale.deletedDate).toBeNull();
          expect(detail.crop).toBeDefined();
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');
          expect(detail).toHaveProperty('client');
          expect(detail.client).toBeDefined();
          expect(detail.client).toHaveProperty('id');
          expect(detail.client).toHaveProperty('first_name');
          expect(detail.client).toHaveProperty('last_name');
          expect(detail.client).toHaveProperty('email');
          expect(detail.client).toHaveProperty('cell_phone_number');
          expect(detail.client).toHaveProperty('address');
          const flatCrops = sale.details.map((detail) => detail.crop.id);
          expect(flatCrops).toContain(crop1.id);
        });
      });
    });
    it('should return the specified number of sales passed by the query (value_pay and crop 2)', async () => {
      const queryData = {
        crops: crop2.id,
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.GREATER_THAN,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(0);
      expect(response.body.current_row_count).toEqual(0);
      expect(response.body.total_page_count).toEqual(0);
      expect(response.body.current_page_count).toEqual(0);
    });

    describe('should return the specified number of sales passed by the query mix filter', () => {
      beforeAll(async () => {
        const data1: SaleDto = {
          date: InformationGenerator.generateRandomDate({ daysToAdd: 3 }),
          amount: 600,
          value_pay: 360_000,
          details: [
            {
              crop: { id: crop1.id },
              client: { id: client1.id },
              amount: 300,
              value_pay: 180_000,
              unit_of_measure: 'GRAMOS',
              is_receivable: true,
            } as SaleDetailsDto,
            {
              crop: { id: crop1.id },
              client: { id: client2.id },
              amount: 300,
              value_pay: 180_000,
              unit_of_measure: 'GRAMOS',
              is_receivable: true,
            } as SaleDetailsDto,
          ],
        };

        const data2: SaleDto = {
          date: InformationGenerator.generateRandomDate({ daysToAdd: 3 }),
          amount: 500,
          value_pay: 300_000,
          details: [
            {
              crop: { id: crop1.id },
              client: { id: client1.id },
              amount: 250,
              value_pay: 150_000,
              unit_of_measure: 'GRAMOS',
              is_receivable: true,
            } as SaleDetailsDto,
            {
              crop: { id: crop1.id },
              client: { id: client2.id },
              amount: 250,
              value_pay: 150_000,
              unit_of_measure: 'GRAMOS',
              is_receivable: true,
            } as SaleDetailsDto,
          ],
        };

        const result = await Promise.all([
          request
            .default(app.getHttpServer())
            .post('/sales/create')
            .set('x-tenant-id', tenantId)
            .set('Cookie', `user-token=${token}`)
            .send(data1),
          request
            .default(app.getHttpServer())
            .post('/sales/create')
            .set('x-tenant-id', tenantId)
            .set('Cookie', `user-token=${token}`)
            .send(data2),
        ]);
      });

      it('should return the specified number of sales passed by the query (GREATER_THAN value_pay , amount)', async () => {
        const queryData = {
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.GREATER_THAN,
          value_pay: 200_000,
          filter_by_amount: true,
          type_filter_amount: TypeFilterNumber.GREATER_THAN,
          amount: 400,
          type_unit_of_measure: 'GRAMOS',
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/sales/all`)
          .query(queryData)
          .set('x-tenant-id', tenantId)
          .set('Cookie', `user-token=${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(2);
        expect(response.body.current_row_count).toEqual(2);
        expect(response.body.total_page_count).toEqual(1);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((sale: Sale) => {
          expect(sale).toHaveProperty('id');
          expect(sale).toHaveProperty('date');
          expect(sale).toHaveProperty('amount');
          expect(sale.amount).toBeGreaterThan(queryData.amount);
          expect(sale).toHaveProperty('value_pay');
          expect(sale.value_pay).toBeGreaterThan(queryData.value_pay);
          expect(sale).toHaveProperty('createdDate');
          expect(sale).toHaveProperty('updatedDate');
          expect(sale).toHaveProperty('deletedDate');
          expect(sale.deletedDate).toBeNull();
          expect(sale.deletedDate).toBeNull();
          expect(sale).toHaveProperty('details');
          expect(sale.details.length).toBeGreaterThan(0);
          sale.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('is_receivable');
            expect(detail).toHaveProperty('crop');
            expect(detail.crop).toBeDefined();
            expect(detail.crop).toHaveProperty('id');
            expect(detail.crop).toHaveProperty('name');
            expect(detail).toHaveProperty('client');
            expect(detail.client).toBeDefined();
            expect(detail.client).toHaveProperty('id');
            expect(detail.client).toHaveProperty('first_name');
            expect(detail.client).toHaveProperty('last_name');
            expect(detail.client).toHaveProperty('email');
            expect(detail.client).toHaveProperty('cell_phone_number');
            expect(detail.client).toHaveProperty('address');
          });
        });
      });
      it('should return the specified number of sales passed by the query (LESS_THAN 1 value_pay , amount)', async () => {
        const queryData = {
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.LESS_THAN,
          value_pay: 400_000,
          filter_by_amount: true,
          type_filter_amount: TypeFilterNumber.LESS_THAN,
          amount: 500,
          type_unit_of_measure: 'GRAMOS',
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/sales/all`)
          .query(queryData)
          .set('x-tenant-id', tenantId)
          .set('Cookie', `user-token=${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(18);
        expect(response.body.current_row_count).toEqual(10);
        expect(response.body.total_page_count).toEqual(2);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((sale: Sale) => {
          expect(sale).toHaveProperty('id');
          expect(sale).toHaveProperty('date');
          expect(sale).toHaveProperty('amount');
          expect(sale.amount).toBeLessThan(queryData.amount);
          expect(sale).toHaveProperty('value_pay');
          expect(sale.value_pay).toBeLessThan(queryData.value_pay);
          expect(sale).toHaveProperty('createdDate');
          expect(sale).toHaveProperty('updatedDate');
          expect(sale).toHaveProperty('deletedDate');
          expect(sale.deletedDate).toBeNull();
          expect(sale.deletedDate).toBeNull();

          expect(sale).toHaveProperty('details');
          expect(sale.details.length).toBeGreaterThan(0);
          sale.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('is_receivable');
            expect(detail).toHaveProperty('crop');
            expect(detail.crop).toBeDefined();
            expect(detail.crop).toHaveProperty('id');
            expect(detail.crop).toHaveProperty('name');
            expect(detail).toHaveProperty('client');
            expect(detail.client).toBeDefined();
            expect(detail.client).toHaveProperty('id');
            expect(detail.client).toHaveProperty('first_name');
            expect(detail.client).toHaveProperty('last_name');
            expect(detail.client).toHaveProperty('email');
            expect(detail.client).toHaveProperty('cell_phone_number');
            expect(detail.client).toHaveProperty('address');
          });
        });
      });
      it('should return the specified number of sales passed by the query (LESS_THAN 2 value_pay , amount)', async () => {
        const queryData = {
          offset: 1,
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.LESS_THAN,
          value_pay: 400_000,
          filter_by_amount: true,
          type_filter_amount: TypeFilterNumber.LESS_THAN,
          amount: 500,
          type_unit_of_measure: 'GRAMOS',
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/sales/all`)
          .query(queryData)
          .set('x-tenant-id', tenantId)
          .set('Cookie', `user-token=${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(18);
        expect(response.body.current_row_count).toEqual(8);
        expect(response.body.total_page_count).toEqual(2);
        expect(response.body.current_page_count).toEqual(2);

        response.body.records.forEach((sale: Sale) => {
          expect(sale).toHaveProperty('id');
          expect(sale).toHaveProperty('date');
          expect(sale).toHaveProperty('amount');
          expect(sale.amount).toBeLessThan(queryData.amount);
          expect(sale).toHaveProperty('value_pay');
          expect(sale.value_pay).toBeLessThan(queryData.value_pay);
          expect(sale).toHaveProperty('createdDate');
          expect(sale).toHaveProperty('updatedDate');
          expect(sale).toHaveProperty('deletedDate');
          expect(sale.deletedDate).toBeNull();
          expect(sale.deletedDate).toBeNull();
          expect(sale).toHaveProperty('details');
          expect(sale.details.length).toBeGreaterThan(0);
          sale.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('is_receivable');
            expect(detail).toHaveProperty('crop');
            expect(detail.crop).toBeDefined();
            expect(detail.crop).toHaveProperty('id');
            expect(detail.crop).toHaveProperty('name');
            expect(detail).toHaveProperty('client');
            expect(detail.client).toBeDefined();
            expect(detail.client).toHaveProperty('id');
            expect(detail.client).toHaveProperty('first_name');
            expect(detail.client).toHaveProperty('last_name');
            expect(detail.client).toHaveProperty('email');
            expect(detail.client).toHaveProperty('cell_phone_number');
            expect(detail.client).toHaveProperty('address');
          });
        });
      });
      it('should return the specified number of sales passed by the query (LESS_THAN 3 value_pay , amount)', async () => {
        const queryData = {
          limit: 12,
          offset: 1,
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.LESS_THAN,
          value_pay: 400_000,
          filter_by_amount: true,
          type_filter_amount: TypeFilterNumber.LESS_THAN,
          amount: 500,
          type_unit_of_measure: 'GRAMOS',
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/sales/all`)
          .query(queryData)
          .set('x-tenant-id', tenantId)
          .set('Cookie', `user-token=${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(18);
        expect(response.body.current_row_count).toEqual(6);
        expect(response.body.total_page_count).toEqual(2);
        expect(response.body.current_page_count).toEqual(2);

        response.body.records.forEach((sale: Sale) => {
          expect(sale).toHaveProperty('id');
          expect(sale).toHaveProperty('date');
          expect(sale).toHaveProperty('amount');
          expect(sale.amount).toBeLessThan(queryData.amount);
          expect(sale).toHaveProperty('value_pay');
          expect(sale.value_pay).toBeLessThan(queryData.value_pay);
          expect(sale).toHaveProperty('createdDate');
          expect(sale).toHaveProperty('updatedDate');
          expect(sale).toHaveProperty('deletedDate');
          expect(sale.deletedDate).toBeNull();
          expect(sale.deletedDate).toBeNull();
          expect(sale).toHaveProperty('details');
          expect(sale.details.length).toBeGreaterThan(0);
          sale.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('is_receivable');
            expect(detail).toHaveProperty('crop');
            expect(detail.crop).toBeDefined();
            expect(detail.crop).toHaveProperty('id');
            expect(detail.crop).toHaveProperty('name');
            expect(detail).toHaveProperty('client');
            expect(detail.client).toBeDefined();
            expect(detail.client).toHaveProperty('id');
            expect(detail.client).toHaveProperty('first_name');
            expect(detail.client).toHaveProperty('last_name');
            expect(detail.client).toHaveProperty('email');
            expect(detail.client).toHaveProperty('cell_phone_number');
            expect(detail.client).toHaveProperty('address');
          });
        });
      });
      it('should return the specified number of sales passed by the query (EQUAL 1 date, value_pay , amount)', async () => {
        const queryData = {
          crops: crop2.id,
          filter_by_date: true,
          type_filter_date: TypeFilterDate.EQUAL,
          date: InformationGenerator.generateRandomDate({ daysToAdd: 3 }),
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.EQUAL,
          value_pay: 360_000,
          filter_by_amount: true,
          type_filter_amount: TypeFilterNumber.EQUAL,
          amount: 600,
          type_unit_of_measure: 'GRAMOS',
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/sales/all`)
          .query(queryData)
          .set('x-tenant-id', tenantId)
          .set('Cookie', `user-token=${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(0);
        expect(response.body.current_row_count).toEqual(0);
        expect(response.body.total_page_count).toEqual(0);
        expect(response.body.current_page_count).toEqual(0);
      });
      it('should return the specified number of sales passed by the query (EQUAL 2 date, value_pay , amount)', async () => {
        const queryData = {
          crops: crop1.id,
          filter_by_date: true,
          type_filter_date: TypeFilterDate.EQUAL,
          date: InformationGenerator.generateRandomDate({ daysToAdd: 3 }),
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.EQUAL,
          value_pay: 360_000,
          filter_by_amount: true,
          type_filter_amount: TypeFilterNumber.EQUAL,
          amount: 600,
          type_unit_of_measure: 'GRAMOS',
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/sales/all`)
          .query(queryData)
          .set('x-tenant-id', tenantId)
          .set('Cookie', `user-token=${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(1);
        expect(response.body.current_row_count).toEqual(1);
        expect(response.body.total_page_count).toEqual(1);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((sale: Sale) => {
          expect(sale).toHaveProperty('id');
          expect(sale).toHaveProperty('date');
          expect(sale.date.split('T')[0]).toBe(
            new Date(queryData.date).toISOString().split('T')[0],
          );
          expect(sale).toHaveProperty('amount');
          expect(sale.amount).toBe(queryData.amount);
          expect(sale).toHaveProperty('value_pay');
          expect(sale.value_pay).toBe(queryData.value_pay);
          expect(sale).toHaveProperty('createdDate');
          expect(sale).toHaveProperty('updatedDate');
          expect(sale).toHaveProperty('deletedDate');
          expect(sale.deletedDate).toBeNull();
          expect(sale.deletedDate).toBeNull();
          expect(sale).toHaveProperty('details');
          expect(sale.details.length).toBeGreaterThan(0);
          sale.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('is_receivable');
            expect(detail).toHaveProperty('crop');
            expect(detail.crop).toBeDefined();
            expect(detail.crop).toHaveProperty('id');
            expect(detail.crop).toHaveProperty('name');
            expect(detail).toHaveProperty('client');
            expect(detail.client).toBeDefined();
            expect(detail.client).toHaveProperty('id');
            expect(detail.client).toHaveProperty('first_name');
            expect(detail.client).toHaveProperty('last_name');
            expect(detail.client).toHaveProperty('email');
            expect(detail.client).toHaveProperty('cell_phone_number');
            expect(detail.client).toHaveProperty('address');
          });
        });
      });
    });

    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/sales/all')
        .query({ offset: 10 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no sale records with the requested pagination',
      );
    });
  });

  describe('sales/one/:id (GET)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('find_one_sale');
    });

    it('should throw an exception for not sending a JWT to the protected path sales/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/one/${falseSaleId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get one sale', async () => {
      const {
        sale: { id },
      } = await reqTools.CreateSale({
        variant: 'generic',
      });

      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      const sale = response.body;
      expect(sale).toHaveProperty('id');
      expect(sale).toHaveProperty('date');
      expect(sale).toHaveProperty('amount');
      expect(sale).toHaveProperty('value_pay');
      expect(sale).toHaveProperty('createdDate');
      expect(sale).toHaveProperty('updatedDate');
      expect(sale).toHaveProperty('deletedDate');
      expect(sale.deletedDate).toBeNull();

      expect(sale).toHaveProperty('details');
      expect(sale.details.length).toBeGreaterThan(0);
      sale.details.forEach((detail) => {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('amount');
        expect(detail).toHaveProperty('value_pay');
        expect(detail).toHaveProperty('is_receivable');
        expect(detail.crop).toBeDefined();
        expect(detail.crop).toHaveProperty('id');
        expect(detail.crop).toHaveProperty('name');
        expect(detail).toHaveProperty('client');
        expect(detail.client).toBeDefined();
        expect(detail.client).toHaveProperty('id');
        expect(detail.client).toHaveProperty('first_name');
        expect(detail.client).toHaveProperty('last_name');
        expect(detail.client).toHaveProperty('email');
        expect(detail.client).toHaveProperty('cell_phone_number');
        expect(detail.client).toHaveProperty('address');
      });
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/sales/one/1234`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });

    it('should throw exception for not finding sale by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/sales/one/${falseSaleId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(`Sale with id: ${falseSaleId} not found`);
    });

    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/sales/one/`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('sales/update/one/:id (PUT)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('update_one_sale');
    });

    it('should throw an exception for not sending a JWT to the protected path sales/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/sales/update/one/${falseSaleId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should update one sale', async () => {
      // const { harvest, crop } = await seedService.CreateHarvest({
      //   quantityEmployees: 15,
      //   amount: 2500,
      // });
      // await seedService.CreateHarvestProcessed({
      //   cropId: crop.id,
      //   harvestId: harvest.id,
      //   amount: 1000,
      // });

      const sale = (
        await reqTools.CreateSale({
          variant: 'generic',
        })
      ).sale;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = sale;

      const bodyRequest: SaleDto = {
        ...rest,
        amount: rest.amount + 10 * sale.details.length,
        value_pay: rest.value_pay + 2000 * sale.details.length,
        details: sale.details.map((detail) => ({
          id: detail.id,
          crop: { id: detail.crop.id },
          client: { id: detail.client.id },
          amount: detail.amount + 10,
          value_pay: detail.value_pay + 2000,
          is_receivable: false,
          unit_of_measure: 'GRAMOS',
        })) as SaleDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/sales/update/one/${sale.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(200);

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('date');
      expect(body).toHaveProperty('amount');
      expect(body.amount).toBe(bodyRequest.amount);
      expect(body).toHaveProperty('value_pay');
      expect(body.value_pay).toBe(bodyRequest.value_pay);
      expect(body).toHaveProperty('createdDate');
      expect(body).toHaveProperty('updatedDate');
      expect(body).toHaveProperty('deletedDate');
      expect(body.deletedDate).toBeNull();

      expect(body).toHaveProperty('details');
      expect(body.details.length).toBeGreaterThan(0);
      body.details.forEach((detail) => {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('amount');
        expect(detail).toHaveProperty('value_pay');
        expect(detail).toHaveProperty('is_receivable');
        expect(detail).toHaveProperty('crop');
        expect(detail.crop).toBeDefined();
        expect(detail.crop).toHaveProperty('id');
        expect(detail.crop).toHaveProperty('name');
        expect(detail).toHaveProperty('client');
        expect(detail.client).toBeDefined();
        expect(detail.client).toHaveProperty('id');
        expect(detail.client).toHaveProperty('first_name');
        expect(detail.client).toHaveProperty('last_name');
        expect(detail.client).toHaveProperty('email');
        expect(detail.client).toHaveProperty('cell_phone_number');
        expect(detail.client).toHaveProperty('address');
      });
    });

    // it('You should throw an exception for attempting to modify a record that has been cascaded out.', async () => {
    //   const { harvest, crop } = await seedService.CreateHarvest({
    //     quantityEmployees: 15,
    //     amount: 2500,
    //   });
    //   await seedService.CreateHarvestProcessed({
    //     cropId: crop.id,
    //     harvestId: harvest.id,
    //     amount: 1000,
    //   });

    //   const sale = (
    //     await seedService.CreateSale({
    //       cropId: crop.id,
    //       isReceivable: false,
    //       quantity: 100,
    //     })
    //   ).sale;

    //   const { id, createdDate, updatedDate, deletedDate, ...rest } = sale;

    //   await saleDetailsRepository.softDelete(sale.details[0].id);

    //   const bodyRequest: SaleDto = {
    //     ...rest,
    //     amount: rest.amount + 10 * sale.details.length,
    //     value_pay: rest.value_pay + 2000 * sale.details.length,
    //     details: sale.details.map((detail) => ({
    //       crop: { id: detail.crop.id },
    //       id: detail.id,
    //       client: { id: detail.client.id },
    //       amount: detail.amount + 10,
    //       value_pay: detail.value_pay + 2000,
    //       is_receivable: true,
    //     })) as SaleDetailsDto[],
    //   };

    //   const { body } = await request
    //     .default(app.getHttpServer())
    //     .put(`/sales/update/one/${sale.id}`)
    //     .set('x-tenant-id', tenantId)
    //     .set('Cookie', `user-token=${token}`)
    //     .send(bodyRequest)
    //     .expect(400);

    //   expect(body.message).toBe(
    //     `You cannot update the record with id ${sale.details[0].id} , it is linked to other records.`,
    //   );
    // });

    it('should throw exception for not finding sale to update', async () => {
      const bodyRequest: SaleDto = {
        ...saleDtoTemplete,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/sales/update/one/${falseSaleId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(404);
      expect(body.message).toEqual(`Sale with id: ${falseSaleId} not found`);
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .put(`/sales/update/one/${falseSaleId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
  });

  describe('sales/remove/one/:id (DELETE)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('remove_one_sale');
    });

    it('should throw an exception for not sending a JWT to the protected path sales/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/sales/remove/one/${falseSaleId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete one sale', async () => {
      const { id } = (
        await reqTools.CreateSale({
          variant: 'generic',
          // isReceivableGeneric: true,
        })
      ).sale;

      await request
        .default(app.getHttpServer())
        .delete(`/sales/remove/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      // const { notFound } = await request
      //   .default(app.getHttpServer())
      //   .get(`/sales/one/${id}`)
      //   .set('x-tenant-id', tenantId)
      //   .set('Cookie', `user-token=${token}`)
      //   .expect(404);
      // expect(notFound).toBe(true);
    });

    it('You should throw exception for trying to delete a sale that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/sales/remove/one/${falseSaleId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(`Sale with id: ${falseSaleId} not found`);
    });

    it('should throw an exception when trying to delete a sale with unpaid sales.', async () => {
      const sale = (
        await reqTools.CreateSale({
          variant: 'generic',
          isReceivableGeneric: true,
        })
      ).sale;

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/sales/remove/one/${sale.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(409);

      expect(body.message).toEqual(
        `The record with id ${sale.id} cannot be deleted because it has unpaid sales`,
      );
    });
  });

  describe('sales/remove/bulk (DELETE)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('remove_bulk_sales');
    });

    it('should throw an exception for not sending a JWT to the protected path sales/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/sales/remove/bulk')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete sales bulk', async () => {
      // const { harvest, crop } = await seedService.CreateHarvest({
      //   quantityEmployees: 15,
      //   amount: 2500,
      // });
      // await seedService.CreateHarvestProcessed({
      //   cropId: crop.id,
      //   harvestId: harvest.id,
      //   amount: 1000,
      // });

      const [{ sale: sale1 }, { sale: sale2 }, { sale: sale3 }] =
        await Promise.all([
          reqTools.CreateSale({
            variant: 'generic',
          }),
          reqTools.CreateSale({
            variant: 'generic',
          }),
          reqTools.CreateSale({
            variant: 'generic',
          }),
        ]);

      const bulkData: RemoveBulkRecordsDto<Sale> = {
        recordsIds: [{ id: sale1.id }, { id: sale2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/sales/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bulkData)
        .expect(200);

      // const [deletedSale1, deletedSale2, remainingSale3] = await Promise.all([
      //   saleRepository.findOne({ where: { id: sale1.id } }),
      //   saleRepository.findOne({ where: { id: sale2.id } }),
      //   saleRepository.findOne({ where: { id: sale3.id } }),
      // ]);

      // expect(deletedSale1).toBeNull();
      // expect(deletedSale2).toBeNull();
      // expect(remainingSale3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/sales/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });

    it('should throw an exception when trying to delete a sale with unpaid sales.', async () => {
      // const { harvest, crop } = await seedService.CreateHarvest({
      //   quantityEmployees: 15,
      //   amount: 2500,
      // });
      // await seedService.CreateHarvestProcessed({
      //   cropId: crop.id,
      //   harvestId: harvest.id,
      //   amount: 1000,
      // });

      const [{ sale: sale1 }, { sale: sale2 }, { sale: sale3 }] =
        await Promise.all([
          reqTools.CreateSale({
            variant: 'generic',
            isReceivableGeneric: true,
          }),
          reqTools.CreateSale({
            variant: 'generic',
            isReceivableGeneric: true,
          }),
          reqTools.CreateSale({
            variant: 'generic',
            isReceivableGeneric: false,
          }),
        ]);

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/sales/remove/bulk`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({
          recordsIds: [{ id: sale1.id }, { id: sale2.id }, { id: sale3.id }],
        })
        .expect(207);
      expect(body).toEqual({
        success: [sale3.id],
        failed: [
          {
            id: sale1.id,
            error: `The record with id ${sale1.id} cannot be deleted because it has unpaid sales`,
          },
          {
            id: sale2.id,
            error: `The record with id ${sale2.id} cannot be deleted because it has unpaid sales`,
          },
        ],
      });
    });
  });

  describe('sales/export/one/pdf/:id (GET)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('export_sale_to_pdf');
    });

    it('should throw an exception for not sending a JWT to the protected path sales/export/one/pdf/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/sales/export/one/pdf/:id')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should export one sale in PDF format', async () => {
      // const { harvest, crop } = await seedService.CreateHarvest({
      //   quantityEmployees: 15,
      //   amount: 2500,
      // });
      // await seedService.CreateHarvestProcessed({
      //   cropId: crop.id,
      //   harvestId: harvest.id,
      //   amount: 1000,
      // });

      const { sale } = await reqTools.CreateSale({
        variant: 'generic',
      });

      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/export/one/pdf/${sale.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body).toBeDefined();
      expect(response.headers['content-type']).toEqual('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });

  describe('should throw an exception because the user JWT does not have permissions for these actions', () => {
    beforeAll(async () => {
      await Promise.all([
        reqTools.removePermissionFromUser(userTest.id, 'create_sale'),
        reqTools.removePermissionFromUser(userTest.id, 'find_all_sales'),
        reqTools.removePermissionFromUser(userTest.id, 'find_one_sale'),
        reqTools.removePermissionFromUser(userTest.id, 'update_one_sale'),
        reqTools.removePermissionFromUser(userTest.id, 'remove_one_sale'),
        reqTools.removePermissionFromUser(userTest.id, 'remove_bulk_sales'),
        reqTools.removePermissionFromUser(userTest.id, 'export_sale_to_pdf'),
      ]);
    });

    it('should throw an exception because the user JWT does not have permissions for this action /sales/create', async () => {
      await reqTools.removePermissionFromUser(userTest.id, 'create_sale');
      const bodyRequest: SaleDto = {
        ...saleDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/sales/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /sales/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/sales/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action sales/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/one/${falseSaleId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action sales/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/sales/update/one/${falseSaleId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action sales/remove/one/:id', async () => {
      // await authService.removePermission(userTest.id, 'remove_one_sale');
      const response = await request
        .default(app.getHttpServer())
        .delete(`/sales/remove/one/${falseSaleId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action sales/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/sales/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action sales/export/one/pdf/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/sales/export/one/pdf/${falseSaleId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });
});
