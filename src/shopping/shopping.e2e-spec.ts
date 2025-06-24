import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';

import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { SuppliesShopping, SuppliesShoppingDetails } from './entities';
import { ShoppingController } from './shopping.controller';
import { ShoppingModule } from './shopping.module';
import { ShoppingService } from './shopping.service';

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { Supply } from 'src/supplies/entities';
import { SuppliesController } from 'src/supplies/supplies.controller';
import { SuppliesModule } from 'src/supplies/supplies.module';
import * as request from 'supertest';
import { ShoppingSuppliesDetailsDto } from './dto/shopping-supplies-details.dto';
import { ShoppingSuppliesDto } from './dto/shopping-supplies.dto';

describe('ShoppingController (e2e)', () => {
  let app: INestApplication;

  let shoppingRepository: Repository<SuppliesShopping>;
  let shoppingDetailsRepository: Repository<SuppliesShoppingDetails>;

  let seedService: SeedService;
  let authService: AuthService;

  let shoppingService: ShoppingService;
  let shoppingController: ShoppingController;
  let suppliesController: SuppliesController;

  let userTest: User;
  let token: string;

  const shoppingDtoTemplete: ShoppingSuppliesDto = {
    date: InformationGenerator.generateRandomDate({}),
    value_pay: 90_000,
    details: [
      {
        supply: { id: InformationGenerator.generateRandomId() },
        supplier: { id: InformationGenerator.generateRandomId() },
        amount: 10_000,
        value_pay: 90_000,
      } as ShoppingSuppliesDetailsDto,
    ],
  };

  const falseShoppingId = InformationGenerator.generateRandomId();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        ShoppingModule,
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
        SuppliesModule,
      ],
    }).compile();

    seedService = moduleFixture.get<SeedService>(SeedService);
    authService = moduleFixture.get<AuthService>(AuthService);

    shoppingService = moduleFixture.get<ShoppingService>(ShoppingService);
    shoppingController =
      moduleFixture.get<ShoppingController>(ShoppingController);
    suppliesController =
      moduleFixture.get<SuppliesController>(SuppliesController);

    app = moduleFixture.createNestApplication();

    shoppingRepository = moduleFixture.get<Repository<SuppliesShopping>>(
      getRepositoryToken(SuppliesShopping),
    );
    shoppingDetailsRepository = moduleFixture.get<
      Repository<SuppliesShoppingDetails>
    >(getRepositoryToken(SuppliesShoppingDetails));

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        errorHttpStatusCode: 400,
        transform: true,
      }),
    );

    await app.init();

    await shoppingRepository.delete({});

    userTest = await authService.createUserToTests();
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await app.close();
  });

  describe('shopping/create (POST)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'create_supply_shopping');
    });

    it('should throw an exception for not sending a JWT to the protected path /shopping/create', async () => {
      const bodyRequest: ShoppingSuppliesDto = {
        ...shoppingDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/shopping/create')
        .send(bodyRequest)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should create a new shopping', async () => {
      const supply1: Supply = (await seedService.CreateSupply({})) as Supply;
      const supply2: Supply = (await seedService.CreateSupply({})) as Supply;
      const supplier1: Supplier = (await seedService.CreateSupplier(
        {},
      )) as Supplier;
      const supplier2: Supplier = (await seedService.CreateSupplier(
        {},
      )) as Supplier;

      const data: ShoppingSuppliesDto = {
        date: InformationGenerator.generateRandomDate({}),
        value_pay: 110_000,
        details: [
          {
            supplier: { id: supplier1.id },
            supply: { id: supply1.id },
            amount: 10_000,
            value_pay: 60_000,
          } as SuppliesShoppingDetails,
          {
            supplier: { id: supplier2.id },
            supply: { id: supply2.id },
            amount: 3_000,
            value_pay: 50_000,
          } as SuppliesShoppingDetails,
        ],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/shopping/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(201);

      expect(response.body).toMatchObject(data);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'date must be a valid ISO 8601 date string',
        'The value must be a multiple of 50',
        'value_pay must be a positive number',
        'value_pay must be an integer number',
        "The sum of fields [value_pay] in 'details' must match the corresponding top-level values.",
        'details should not be empty',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/shopping/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });
  });

  describe('shopping/all (GET)', () => {
    let supply1: Supply;
    let supply2: Supply;
    let supplier1: Supplier;
    let supplier2: Supplier;

    beforeAll(async () => {
      await shoppingRepository.delete({});

      const supplies = await Promise.all([
        seedService.CreateSupply({}),
        seedService.CreateSupply({}),
      ]);

      supply1 = supplies[0] as Supply;
      supply2 = supplies[1] as Supply;

      const suppliers = await Promise.all([
        seedService.CreateSupplier({}),
        seedService.CreateSupplier({}),
      ]);

      supplier1 = suppliers[0] as Supplier;
      supplier2 = suppliers[1] as Supplier;

      const data1: ShoppingSuppliesDto = {
        date: InformationGenerator.generateRandomDate({}),
        value_pay: 60_000,
        details: [
          {
            supplier: { id: supplier1.id },
            supply: { id: supply1.id },
            amount: 1000,
            value_pay: 60_000,
          } as ShoppingSuppliesDetailsDto,
        ],
      };
      const data2: ShoppingSuppliesDto = {
        date: InformationGenerator.generateRandomDate({ daysToAdd: 5 }),
        value_pay: 90_000,
        details: [
          {
            supplier: { id: supplier2.id },
            supply: { id: supply2.id },
            amount: 1500,
            value_pay: 90_000,
          } as ShoppingSuppliesDetailsDto,
        ],
      };
      const data3: ShoppingSuppliesDto = {
        date: InformationGenerator.generateRandomDate({ daysToAdd: 10 }),
        value_pay: 180_000,
        details: [
          {
            supplier: { id: supplier2.id },
            supply: { id: supply2.id },
            amount: 3000,
            value_pay: 180_000,
          } as ShoppingSuppliesDetailsDto,
        ],
      };

      for (let i = 0; i < 6; i++) {
        await shoppingService.createShopping(data1);
        await shoppingService.createShopping(data2);
        await shoppingService.createShopping(data3);
      }
      await authService.addPermission(
        userTest.id,
        'find_all_supplies_shopping',
      );
    }, 10_000);

    it('should throw an exception for not sending a JWT to the protected path /shopping/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/shopping/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only 10 shopping for default by not sending paging parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/shopping/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });

    it('should return the specified number of shopping passed by the paging arguments by the URL', async () => {
      const response1 = await request
        .default(app.getHttpServer())
        .get(`/shopping/all`)
        .query({ limit: 11, offset: 0 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response1.body.total_row_count).toEqual(18);
      expect(response1.body.current_row_count).toEqual(11);
      expect(response1.body.total_page_count).toEqual(2);
      expect(response1.body.current_page_count).toEqual(1);
      response1.body.records.forEach((shopping: SuppliesShopping) => {
        expect(shopping).toHaveProperty('id');
        expect(shopping).toHaveProperty('date');
        expect(shopping).toHaveProperty('value_pay');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('supplier');
          expect(detail.supplier).toBeDefined();
          expect(detail.supplier).toHaveProperty('id');
          expect(detail.supplier).toHaveProperty('first_name');
          expect(detail.supplier).toHaveProperty('last_name');
          expect(detail.supplier).toHaveProperty('email');
          expect(detail.supplier).toHaveProperty('cell_phone_number');
          expect(detail.supplier).toHaveProperty('address');
          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });

      const response2 = await request
        .default(app.getHttpServer())
        .get(`/shopping/all`)
        .query({ limit: 11, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response2.body.total_row_count).toEqual(18);
      expect(response2.body.current_row_count).toEqual(7);
      expect(response2.body.total_page_count).toEqual(2);
      expect(response2.body.current_page_count).toEqual(2);
      response2.body.records.forEach((shopping: SuppliesShopping) => {
        expect(shopping).toHaveProperty('id');
        expect(shopping).toHaveProperty('date');
        expect(shopping).toHaveProperty('value_pay');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('supplier');
          expect(detail.supplier).toBeDefined();
          expect(detail.supplier).toHaveProperty('id');
          expect(detail.supplier).toHaveProperty('first_name');
          expect(detail.supplier).toHaveProperty('last_name');
          expect(detail.supplier).toHaveProperty('email');
          expect(detail.supplier).toHaveProperty('cell_phone_number');
          expect(detail.supplier).toHaveProperty('address');
          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });
    it('should return the specified number of shopping passed by the query (includes supply)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/all`)
        .query({ supplies: supply2.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((shopping: SuppliesShopping) => {
        expect(shopping).toHaveProperty('id');
        expect(shopping).toHaveProperty('date');
        expect(shopping).toHaveProperty('value_pay');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('supplier');
          expect(detail.supplier).toBeDefined();
          expect(detail.supplier).toHaveProperty('id');
          expect(detail.supplier).toHaveProperty('first_name');
          expect(detail.supplier).toHaveProperty('last_name');
          expect(detail.supplier).toHaveProperty('email');
          expect(detail.supplier).toHaveProperty('cell_phone_number');
          expect(detail.supplier).toHaveProperty('address');
          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });
    it('should return the specified number of shopping passed by the query (includes supply)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/all`)
        .query({ supplies: supply1.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((shopping: SuppliesShopping) => {
        expect(shopping).toHaveProperty('id');
        expect(shopping).toHaveProperty('date');
        expect(shopping).toHaveProperty('value_pay');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('supplier');
          expect(detail.supplier).toBeDefined();
          expect(detail.supplier).toHaveProperty('id');
          expect(detail.supplier).toHaveProperty('first_name');
          expect(detail.supplier).toHaveProperty('last_name');
          expect(detail.supplier).toHaveProperty('email');
          expect(detail.supplier).toHaveProperty('cell_phone_number');
          expect(detail.supplier).toHaveProperty('address');
          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });

    it('should return the specified number of shopping passed by the query (includes supplier)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/all`)
        .query({ suppliers: supplier1.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((shopping: SuppliesShopping) => {
        expect(shopping).toHaveProperty('id');
        expect(shopping).toHaveProperty('date');
        expect(shopping).toHaveProperty('value_pay');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('supplier');
          expect(detail.supplier).toBeDefined();
          expect(detail.supplier).toHaveProperty('id');
          expect(detail.supplier).toHaveProperty('first_name');
          expect(detail.supplier).toHaveProperty('last_name');
          expect(detail.supplier).toHaveProperty('email');
          expect(detail.supplier).toHaveProperty('cell_phone_number');
          expect(detail.supplier).toHaveProperty('address');
          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });

    it('should return the specified number of shopping passed by the query (includes supplier)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/all`)
        .query({ suppliers: supplier2.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((shopping: SuppliesShopping) => {
        expect(shopping).toHaveProperty('id');
        expect(shopping).toHaveProperty('date');
        expect(shopping).toHaveProperty('value_pay');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('supplier');
          expect(detail.supplier).toBeDefined();
          expect(detail.supplier).toHaveProperty('id');
          expect(detail.supplier).toHaveProperty('first_name');
          expect(detail.supplier).toHaveProperty('last_name');
          expect(detail.supplier).toHaveProperty('email');
          expect(detail.supplier).toHaveProperty('cell_phone_number');
          expect(detail.supplier).toHaveProperty('address');
          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });

    it('should return the specified number of shopping passed by the query (after date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.AFTER,
        date: InformationGenerator.generateRandomDate({}),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((shopping: SuppliesShopping) => {
        expect(shopping).toHaveProperty('id');
        expect(shopping).toHaveProperty('date');
        expect(new Date(shopping.date) > new Date(queryData.date)).toBe(true);
        expect(shopping).toHaveProperty('value_pay');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('supplier');
          expect(detail.supplier).toBeDefined();
          expect(detail.supplier).toHaveProperty('id');
          expect(detail.supplier).toHaveProperty('first_name');
          expect(detail.supplier).toHaveProperty('last_name');
          expect(detail.supplier).toHaveProperty('email');
          expect(detail.supplier).toHaveProperty('cell_phone_number');
          expect(detail.supplier).toHaveProperty('address');
          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });
    it('should return the specified number of shopping passed by the query (before date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.BEFORE,
        date: InformationGenerator.generateRandomDate({ daysToAdd: 1 }),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((shopping: SuppliesShopping) => {
        expect(shopping).toHaveProperty('id');
        expect(shopping).toHaveProperty('date');
        expect(new Date(shopping.date) < new Date(queryData.date)).toBe(true);
        expect(shopping).toHaveProperty('value_pay');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('supplier');
          expect(detail.supplier).toBeDefined();
          expect(detail.supplier).toHaveProperty('id');
          expect(detail.supplier).toHaveProperty('first_name');
          expect(detail.supplier).toHaveProperty('last_name');
          expect(detail.supplier).toHaveProperty('email');
          expect(detail.supplier).toHaveProperty('cell_phone_number');
          expect(detail.supplier).toHaveProperty('address');
          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });
    it('should return the specified number of shopping passed by the query (equal date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.EQUAL,
        date: InformationGenerator.generateRandomDate({ daysToAdd: 5 }),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((shopping: SuppliesShopping) => {
        expect(shopping).toHaveProperty('id');
        expect(shopping).toHaveProperty('date');
        expect(shopping.date.split('T')[0]).toBe(
          new Date(queryData.date).toISOString().split('T')[0],
        );
        expect(shopping).toHaveProperty('value_pay');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('supplier');
          expect(detail.supplier).toBeDefined();
          expect(detail.supplier).toHaveProperty('id');
          expect(detail.supplier).toHaveProperty('first_name');
          expect(detail.supplier).toHaveProperty('last_name');
          expect(detail.supplier).toHaveProperty('email');
          expect(detail.supplier).toHaveProperty('cell_phone_number');
          expect(detail.supplier).toHaveProperty('address');
          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });
    it('should return the specified number of shopping passed by the query (equal value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.EQUAL,
        value_pay: 60_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((shopping: SuppliesShopping) => {
        expect(shopping).toHaveProperty('id');
        expect(shopping).toHaveProperty('date');
        expect(shopping).toHaveProperty('value_pay');
        expect(shopping.value_pay).toBe(queryData.value_pay);
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('supplier');
          expect(detail.supplier).toBeDefined();
          expect(detail.supplier).toHaveProperty('id');
          expect(detail.supplier).toHaveProperty('first_name');
          expect(detail.supplier).toHaveProperty('last_name');
          expect(detail.supplier).toHaveProperty('email');
          expect(detail.supplier).toHaveProperty('cell_phone_number');
          expect(detail.supplier).toHaveProperty('address');
          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });
    it('should return the specified number of shopping passed by the query (max value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.GREATER_THAN,
        value_pay: 60_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((shopping: SuppliesShopping) => {
        expect(shopping).toHaveProperty('id');
        expect(shopping).toHaveProperty('date');
        expect(shopping).toHaveProperty('value_pay');
        expect(shopping.value_pay).toBeGreaterThan(queryData.value_pay);
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('supplier');
          expect(detail.supplier).toBeDefined();
          expect(detail.supplier).toHaveProperty('id');
          expect(detail.supplier).toHaveProperty('first_name');
          expect(detail.supplier).toHaveProperty('last_name');
          expect(detail.supplier).toHaveProperty('email');
          expect(detail.supplier).toHaveProperty('cell_phone_number');
          expect(detail.supplier).toHaveProperty('address');
          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });
    it('should return the specified number of shopping passed by the query (min value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.LESS_THAN,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((shopping: SuppliesShopping) => {
        expect(shopping).toHaveProperty('id');
        expect(shopping).toHaveProperty('date');
        expect(shopping).toHaveProperty('value_pay');
        expect(shopping.value_pay).toBeLessThan(queryData.value_pay);
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('supplier');
          expect(detail.supplier).toBeDefined();
          expect(detail.supplier).toHaveProperty('id');
          expect(detail.supplier).toHaveProperty('first_name');
          expect(detail.supplier).toHaveProperty('last_name');
          expect(detail.supplier).toHaveProperty('email');
          expect(detail.supplier).toHaveProperty('cell_phone_number');
          expect(detail.supplier).toHaveProperty('address');
          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });

    describe('should return the specified number of shopping passed by the query mix filter', () => {
      let dateShopping1 = InformationGenerator.generateRandomDate({ daysToAdd: 3 });
      let dateShopping2 = InformationGenerator.generateRandomDate({});

      beforeAll(async () => {
        const data1: ShoppingSuppliesDto = {
          date: dateShopping1,
          value_pay: 360_000,
          details: [
            {
              supplier: { id: supplier1.id },
              supply: { id: supply1.id },
              amount: 3000,
              value_pay: 180_000,
            } as ShoppingSuppliesDetailsDto,
            {
              supplier: { id: supplier2.id },
              supply: { id: supply2.id },
              amount: 3000,
              value_pay: 180_000,
            } as ShoppingSuppliesDetailsDto,
          ],
        };

        const data2: ShoppingSuppliesDto = {
          date: dateShopping1,
          value_pay: 300_000,
          details: [
            {
              supplier: { id: supplier1.id },
              supply: { id: supply1.id },
              amount: 2500,
              value_pay: 150_000,
            } as ShoppingSuppliesDetailsDto,
            {
              supplier: { id: supplier2.id },
              supply: { id: supply2.id },
              amount: 2500,
              value_pay: 150_000,
            } as ShoppingSuppliesDetailsDto,
          ],
        };

        await Promise.all([
          shoppingController.create(data1),
          shoppingController.create(data2),
        ]);
      }, 10_000);

      it('should return the specified number of shopping passed by the query (EQUAL date, value_pay, supplies, suppliers)', async () => {
        const queryData = {
          filter_by_date: true,
          type_filter_date: TypeFilterDate.EQUAL,
          date: dateShopping1,

          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.EQUAL,
          value_pay: 300_000,

          supplies: supply1.id,
          suppliers: supplier1.id,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/shopping/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(1);
        expect(response.body.current_row_count).toEqual(1);
        expect(response.body.total_page_count).toEqual(1);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((shopping: SuppliesShopping) => {
          expect(shopping).toHaveProperty('id');
          expect(shopping).toHaveProperty('date');
          expect(shopping.date.split('T')[0]).toBe(
            new Date(queryData.date).toISOString().split('T')[0],
          );
          expect(shopping).toHaveProperty('value_pay');
          expect(shopping.value_pay).toBe(queryData.value_pay);
          expect(shopping).toHaveProperty('createdDate');
          expect(shopping).toHaveProperty('updatedDate');
          expect(shopping).toHaveProperty('deletedDate');
          expect(shopping.deletedDate).toBeNull();
          expect(shopping).toHaveProperty('details');
          expect(shopping.details.length).toBeGreaterThan(0);
          shopping.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('supplier');
            expect(detail.supplier).toBeDefined();
            expect(detail.supplier).toHaveProperty('id');

            expect(detail.supplier).toHaveProperty('first_name');
            expect(detail.supplier).toHaveProperty('last_name');
            expect(detail.supplier).toHaveProperty('email');
            expect(detail.supplier).toHaveProperty('cell_phone_number');
            expect(detail.supplier).toHaveProperty('address');
            expect(detail).toHaveProperty('supply');
            expect(detail.supply).toBeDefined();
            expect(detail.supply).toHaveProperty('id');

            expect(detail.supply).toHaveProperty('name');
          });

          const flatSupplies = shopping.details.map(
            (detail) => detail.supply.id,
          );

          expect(flatSupplies).toContain(queryData.supplies);

          const flatSuppliers = shopping.details.map(
            (detail) => detail.supplier.id,
          );

          expect(flatSuppliers).toContain(queryData.suppliers);
        });
      });

      it('should return the specified number of shopping passed by the query (GREATER_THAN date, value_pay, supplies, suppliers)', async () => {
        const queryData = {
          filter_by_date: true,
          type_filter_date: TypeFilterDate.AFTER,
          date: dateShopping2,

          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.GREATER_THAN,
          value_pay: 60_000,

          supplies: supply2.id,
          suppliers: supplier2.id,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/shopping/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(14);
        expect(response.body.current_row_count).toEqual(10);
        expect(response.body.total_page_count).toEqual(2);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((shopping: SuppliesShopping) => {
          expect(shopping).toHaveProperty('id');
          expect(shopping).toHaveProperty('date');
          expect(new Date(shopping.date) > new Date(queryData.date)).toBe(true);
          expect(shopping).toHaveProperty('value_pay');
          expect(shopping.value_pay).toBeGreaterThan(queryData.value_pay);
          expect(shopping).toHaveProperty('createdDate');
          expect(shopping).toHaveProperty('updatedDate');
          expect(shopping).toHaveProperty('deletedDate');
          expect(shopping.deletedDate).toBeNull();
          expect(shopping).toHaveProperty('details');
          expect(shopping.details.length).toBeGreaterThan(0);
          shopping.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('supplier');
            expect(detail.supplier).toBeDefined();
            expect(detail.supplier).toHaveProperty('id');
            expect(detail.supplier).toHaveProperty('first_name');
            expect(detail.supplier).toHaveProperty('last_name');
            expect(detail.supplier).toHaveProperty('email');
            expect(detail.supplier).toHaveProperty('cell_phone_number');
            expect(detail.supplier).toHaveProperty('address');
            expect(detail).toHaveProperty('supply');
            expect(detail.supply).toBeDefined();
            expect(detail.supply).toHaveProperty('id');
            expect(detail.supply).toHaveProperty('name');
          });

          const flatSupplies = shopping.details.map(
            (detail) => detail.supply.id,
          );

          expect(flatSupplies).toContain(queryData.supplies);

          const flatSuppliers = shopping.details.map(
            (detail) => detail.supplier.id,
          );

          expect(flatSuppliers).toContain(queryData.suppliers);
        });
      });
      it('should return the specified number of shopping passed by the query (LESS_THAN date, value_pay, supplies, suppliers)', async () => {
        const queryData = {
          filter_by_date: true,
          type_filter_date: TypeFilterDate.BEFORE,
          date: dateShopping1,

          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.LESS_THAN,
          value_pay: 360_000,

          supplies: supply1.id,
          suppliers: supplier1.id,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/shopping/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(6);
        expect(response.body.current_row_count).toEqual(6);
        expect(response.body.total_page_count).toEqual(1);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((shopping: SuppliesShopping) => {
          expect(shopping).toHaveProperty('id');
          expect(shopping).toHaveProperty('date');
          expect(new Date(shopping.date) < new Date(queryData.date)).toBe(true);
          expect(shopping).toHaveProperty('value_pay');
          expect(shopping.value_pay).toBeLessThan(queryData.value_pay);
          expect(shopping).toHaveProperty('createdDate');
          expect(shopping).toHaveProperty('updatedDate');
          expect(shopping).toHaveProperty('deletedDate');
          expect(shopping.deletedDate).toBeNull();
          expect(shopping).toHaveProperty('details');
          expect(shopping.details.length).toBeGreaterThan(0);
          shopping.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('supplier');
            expect(detail.supplier).toBeDefined();
            expect(detail.supplier).toHaveProperty('id');
            expect(detail.supplier).toHaveProperty('first_name');
            expect(detail.supplier).toHaveProperty('last_name');
            expect(detail.supplier).toHaveProperty('email');
            expect(detail.supplier).toHaveProperty('cell_phone_number');
            expect(detail.supplier).toHaveProperty('address');
            expect(detail).toHaveProperty('supply');
            expect(detail.supply).toBeDefined();
            expect(detail.supply).toHaveProperty('id');
            expect(detail.supply).toHaveProperty('name');
          });

          const flatSupplies = shopping.details.map(
            (detail) => detail.supply.id,
          );

          expect(flatSupplies).toContain(queryData.supplies);

          const flatSuppliers = shopping.details.map(
            (detail) => detail.supplier.id,
          );

          expect(flatSuppliers).toContain(queryData.suppliers);
        });
      });
    });

    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/shopping/all')
        .query({ offset: 10 })
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no shopping records with the requested pagination',
      );
    });
  });

  describe('shopping/one/:id (GET)', () => {
    beforeAll(async () => {
      await authService.addPermission(
        userTest.id,
        'find_one_supplies_shopping',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path shopping/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/one/${falseShoppingId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get one shopping', async () => {
      const record = (await seedService.CreateShopping({})).shopping;

      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const shopping = response.body;
      expect(shopping).toHaveProperty('id');
      expect(shopping).toHaveProperty('date');
      expect(shopping).toHaveProperty('value_pay');
      expect(shopping).toHaveProperty('createdDate');
      expect(shopping).toHaveProperty('updatedDate');
      expect(shopping).toHaveProperty('deletedDate');
      expect(shopping.deletedDate).toBeNull();
      expect(shopping).toHaveProperty('details');
      expect(shopping.details.length).toBeGreaterThan(0);
      shopping.details.forEach((detail) => {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('value_pay');
        expect(detail).toHaveProperty('amount');
        expect(detail).toHaveProperty('supplier');
        expect(detail.supplier).toBeDefined();
        expect(detail.supplier).toHaveProperty('id');
        expect(detail.supplier).toHaveProperty('first_name');
        expect(detail.supplier).toHaveProperty('last_name');
        expect(detail.supplier).toHaveProperty('email');
        expect(detail.supplier).toHaveProperty('cell_phone_number');
        expect(detail.supplier).toHaveProperty('address');
        expect(detail).toHaveProperty('supply');
        expect(detail.supply).toHaveProperty('id');
        expect(detail.supply).toHaveProperty('name');
      });
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/shopping/one/1234`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });

    it('should throw exception for not finding shopping by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/shopping/one/${falseShoppingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Supplies Shopping with id: ${falseShoppingId} not found`,
      );
    });

    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/shopping/one/`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('shopping/update/one/:id (PATCH)', () => {
    beforeAll(async () => {
      await authService.addPermission(
        userTest.id,
        'update_one_supplies_shopping',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path shopping/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/shopping/update/one/${falseShoppingId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should update one shopping', async () => {
      const record = (await seedService.CreateShopping({})).shopping;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const bodyRequest: ShoppingSuppliesDto = {
        ...rest,
        value_pay: rest.value_pay + 2000 * record.details.length,
        details: record.details.map((detail) => ({
          id: detail.id,
          supplier: { id: detail.supplier.id },
          supply: { id: detail.supply.id },
          amount: detail.amount + 500,
          value_pay: detail.value_pay + 2000,
        })) as ShoppingSuppliesDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/shopping/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(200);

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('date');
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
        expect(detail).toHaveProperty('value_pay');
        expect(detail).toHaveProperty('amount');
        expect(detail).toHaveProperty('supplier');
        expect(detail.supplier).toBeDefined();
        expect(detail.supplier).toHaveProperty('id');
        expect(detail.supplier).toHaveProperty('first_name');
        expect(detail.supplier).toHaveProperty('last_name');
        expect(detail.supplier).toHaveProperty('email');
        expect(detail.supplier).toHaveProperty('cell_phone_number');
        expect(detail.supplier).toHaveProperty('address');
        expect(detail).toHaveProperty('supply');
        expect(detail.supply).toHaveProperty('id');
        expect(detail.supply).toHaveProperty('name');
      });
    });

    it('You should throw an exception for attempting to delete a record that has been cascaded out.', async () => {
      const record = (
        await seedService.CreateShoppingExtended({ quantitySupplies: 3 })
      ).shopping;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const idShoppingDetail = record.details[0].id;

      await shoppingDetailsRepository.softDelete(idShoppingDetail);

      const bodyRequest = {
        ...rest,
        value_pay: rest.value_pay - record.details[0].value_pay,
        details: record.details
          .filter((detail) => detail.id !== idShoppingDetail)
          .map(({ createdDate, updatedDate, deletedDate, ...rest }) => ({
            ...rest,
          })) as ShoppingSuppliesDetailsDto[],
      };
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/shopping/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot delete the record with id ${record.details[0].id} , it is linked to other records.`,
      );
    });

    it('You should throw an exception for attempting to modify a record that has been cascaded out.', async () => {
      const record = (await seedService.CreateShopping({})).shopping;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      await shoppingDetailsRepository.softDelete(record.details[0].id);

      const bodyRequest = {
        ...rest,
        details: record.details.map(
          ({ createdDate, updatedDate, deletedDate, ...rest }) => ({
            ...rest,
            amount: rest.amount + 500,
            supplier: { id: rest.supplier.id },
            supply: { id: rest.supply.id },
          }),
        ) as ShoppingSuppliesDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/shopping/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot update the record with id ${record.details[0].id} , it is linked to other records.`,
      );
    });

    it('should throw exception for not finding shopping to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/shopping/update/one/${falseShoppingId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(shoppingDtoTemplete)
        .expect(404);
      expect(body.message).toEqual(
        `Supplies Shopping with id: ${falseShoppingId} not found`,
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/shopping/update/one/${falseShoppingId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
  });

  describe('shopping/export/one/pdf/:id (GET)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'export_shopping_to_pdf');
    });

    it('should throw an exception for not sending a JWT to the protected path shopping/export/one/pdf/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/shopping/export/one/pdf/:id')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should export one shopping in PDF format', async () => {
      const record = (await seedService.CreateShopping({})).shopping;
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/export/one/pdf/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toBeDefined();
      expect(response.headers['content-type']).toEqual('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });

  describe('shopping/remove/one/:id (DELETE)', () => {
    beforeAll(async () => {
      await authService.addPermission(
        userTest.id,
        'remove_one_supplies_shopping',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path shopping/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/shopping/remove/one/${falseShoppingId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete one shopping', async () => {
      const { id, details } = (await seedService.CreateShopping({})).shopping;

      const suppliesID = details.map((detail) => detail.supply.id);

      const previousStock = await Promise.all(
        suppliesID.map(async (supplyID) => {
          const { id, name, stock } =
            await suppliesController.findOne(supplyID);
          return { id, name, stock };
        }),
      );

      await request
        .default(app.getHttpServer())
        .delete(`/shopping/remove/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // validar que el stock cambio
      const currentStock = await Promise.all(
        suppliesID.map(async (supplyID) => {
          const { id, name, stock } =
            await suppliesController.findOne(supplyID);
          return { id, name, stock };
        }),
      );

      previousStock.forEach((supply) => {
        const currentSupply = currentStock.find(
          (s) => s.id === supply.id,
        ) as any;
        expect(currentSupply.stock.amount).toBeLessThan(supply.stock.amount);

        const { amount: shoppingAmount } = details.find(
          (detail) => detail.supply.id === supply.id,
        );

        expect(currentSupply.stock.amount).toBe(
          supply.stock.amount - shoppingAmount,
        );
      });

      const { notFound } = await request
        .default(app.getHttpServer())
        .get(`/shopping/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(notFound).toBe(true);
    });

    it('You should throw exception for trying to delete a shopping that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/shopping/remove/one/${falseShoppingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Supplies Shopping with id: ${falseShoppingId} not found`,
      );
    });
  });

  describe('shopping/remove/bulk (DELETE)', () => {
    beforeAll(async () => {
      await authService.addPermission(
        userTest.id,
        'remove_bulk_supplies_shopping',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path shopping/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/shopping/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete shopping bulk', async () => {
      const [
        { shopping: shopping1 },
        { shopping: shopping2 },
        { shopping: shopping3 },
      ] = await Promise.all([
        seedService.CreateShopping({}),
        seedService.CreateShopping({}),
        seedService.CreateShopping({}),
      ]);

      const bulkData: RemoveBulkRecordsDto<SuppliesShopping> = {
        recordsIds: [{ id: shopping1.id }, { id: shopping2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/shopping/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(bulkData)
        .expect(200);

      const [deletedShopping1, deletedShopping2, remainingShopping3] =
        await Promise.all([
          shoppingRepository.findOne({ where: { id: shopping1.id } }),
          shoppingRepository.findOne({ where: { id: shopping2.id } }),
          shoppingRepository.findOne({ where: { id: shopping3.id } }),
        ]);

      expect(deletedShopping1).toBeNull();
      expect(deletedShopping2).toBeNull();
      expect(remainingShopping3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/shopping/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });
  });

  describe('should throw an exception because the user JWT does not have permissions for these actions', () => {
    beforeAll(async () => {
      await Promise.all([
        authService.removePermission(
          userTest.id,
          'remove_bulk_supplies_shopping',
        ),
        authService.removePermission(
          userTest.id,
          'remove_one_supplies_shopping',
        ),
        authService.removePermission(userTest.id, 'export_shopping_to_pdf'),
        authService.removePermission(
          userTest.id,
          'update_one_supplies_shopping',
        ),
        authService.removePermission(userTest.id, 'find_one_supplies_shopping'),
        authService.removePermission(userTest.id, 'find_all_supplies_shopping'),
        authService.removePermission(userTest.id, 'create_supply_shopping'),
      ]);
    });

    it('should throw an exception because the user JWT does not have permissions for this action shopping/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/shopping/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action shopping/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/shopping/remove/one/${falseShoppingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action shopping/export/one/pdf/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/export/one/pdf/${falseShoppingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action shopping/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/shopping/update/one/${falseShoppingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action shopping/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/one/${falseShoppingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /shopping/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/shopping/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /shopping/create', async () => {
      const bodyRequest: ShoppingSuppliesDto = {
        ...shoppingDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/shopping/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });
});
