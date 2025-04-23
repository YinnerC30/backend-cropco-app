import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { SuppliersController } from 'src/suppliers/suppliers.controller';

import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { User } from 'src/users/entities/user.entity';
import { IsNull, Repository } from 'typeorm';
import { SuppliesShopping, SuppliesShoppingDetails } from './entities';
import { ShoppingController } from './shopping.controller';
import { ShoppingModule } from './shopping.module';
import { ShoppingService } from './shopping.service';

import { CreateSupplyDto } from 'src/supplies/dto/create-supply.dto';
import { SuppliesController } from 'src/supplies/supplies.controller';
import { SuppliesService } from 'src/supplies/supplies.service';

import * as request from 'supertest';
import { CreateShoppingSuppliesDto } from './dto/create-shopping-supplies.dto';
import { ShoppingSuppliesDetailsDto } from './dto/shopping-supplies-details.dto';
import { UpdateSuppliesShoppingDto } from './dto/update-supplies-shopping.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { Supply } from 'src/supplies/entities';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';

describe('ShoppingController (e2e)', () => {
  let app: INestApplication;

  let shoppingRepository: Repository<SuppliesShopping>;
  let shoppingDetailsRepository: Repository<SuppliesShoppingDetails>;

  let seedService: SeedService;
  let authService: AuthService;

  let suppliesService: SuppliesService;
  let suppliesController: SuppliesController;

  let supplierService: SuppliersService;
  let supplierController: SuppliersController;

  let shoppingService: ShoppingService;
  let shoppingController: ShoppingController;

  let userTest: User;
  let token: string;

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
      ],
    }).compile();

    seedService = moduleFixture.get<SeedService>(SeedService);
    authService = moduleFixture.get<AuthService>(AuthService);

    shoppingService = moduleFixture.get<ShoppingService>(ShoppingService);
    shoppingController =
      moduleFixture.get<ShoppingController>(ShoppingController);

    suppliesService = moduleFixture.get<SuppliesService>(SuppliesService);
    suppliesController =
      moduleFixture.get<SuppliesController>(SuppliersController);

    supplierService = moduleFixture.get<SuppliersService>(SuppliersService);
    supplierController =
      moduleFixture.get<SuppliersController>(SuppliersController);

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

    shoppingRepository = moduleFixture.get<Repository<SuppliesShopping>>(
      getRepositoryToken(SuppliesShopping),
    );
    shoppingDetailsRepository = moduleFixture.get<
      Repository<SuppliesShoppingDetails>
    >(getRepositoryToken(SuppliesShoppingDetails));

    await shoppingRepository.delete({});
    await suppliesService.deleteAllSupplies();
    await supplierService.deleteAllSupplier();

    userTest = await authService.createUserToTests();
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    // await shoppingRepository.delete({});
    await app.close();
  });

  describe('shopping/create (POST)', () => {
    it('should throw an exception for not sending a JWT to the protected path /shopping/create', async () => {
      const data: CreateShoppingSuppliesDto = {
        date: '',
        total: 0,
        details: [],
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/shopping/create')
        .send(data)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /shopping/create', async () => {
      await authService.removePermission(userTest.id, 'create_supply_shopping');

      const data: CreateShoppingSuppliesDto = {
        date: '',
        total: 0,
        details: [],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/shopping/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });

  it('should create a new shopping', async () => {
    await authService.addPermission(userTest.id, 'create_supply_shopping');

    const supply1 = await suppliesService.create({
      name: 'supply name 1',
      brand: 'brand name',
      unit_of_measure: 'GRAMOS',
      observation: 'none observation',
    } as CreateSupplyDto);

    const supply2 = await suppliesService.create({
      name: 'supply name 2',
      brand: 'brand name',
      unit_of_measure: 'MILILITROS',
      observation: 'none observation',
    } as CreateSupplyDto);

    const supplier1 = await supplierController.create({
      first_name: 'Supplier test1',
      last_name: 'Supplier test',
      email: 'suppliertest123@mail.com',
      cell_phone_number: '3127836149',
      address: 'no address',
    });

    const supplier2 = await supplierController.create({
      first_name: 'Supplier test2',
      last_name: 'Supplier test',
      email: 'suppliertest1234@mail.com',
      cell_phone_number: '3127836149',
      address: 'no address',
    });

    const data: CreateShoppingSuppliesDto = {
      date: new Date().toISOString(),
      total: 110_000,
      details: [
        {
          supplier: { id: supplier1.id },
          supply: { id: supply1.id },
          amount: 10_000,
          total: 60_000,
        } as SuppliesShoppingDetails,
        {
          supplier: { id: supplier2.id },
          supply: { id: supply2.id },
          amount: 3_000,
          total: 50_000,
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
    await authService.addPermission(userTest.id, 'create_supply_shopping');
    const errorMessage = [
      'date must be a valid ISO 8601 date string',
      'The value must be a multiple of 50',
      'total must be a positive number',
      'total must be an integer number',
      "The sum of fields [total] in 'details' must match the corresponding top-level values.",
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

  describe('shopping/all (GET)', () => {
    let supply1: Supply;
    let supply2: Supply;
    let supplier1: Supplier;
    let supplier2: Supplier;

    beforeAll(async () => {
      await shoppingRepository.delete({});

      [supply1, supply2] = (await suppliesService.findAll({})).records;
      [supplier1, supplier2] = (await supplierService.findAll({})).records;

      const data1: CreateShoppingSuppliesDto = {
        date: new Date().toISOString(),
        total: 60_000,
        details: [
          {
            supplier: { id: supplier1.id },
            supply: { id: supply1.id },
            amount: 1000,
            total: 60_000,
          } as ShoppingSuppliesDetailsDto,
        ],
      };

      const data2: CreateShoppingSuppliesDto = {
        date: new Date(
          new Date().setDate(new Date().getDate() + 5),
        ).toISOString(),
        total: 90_000,
        details: [
          {
            supplier: { id: supplier2.id },
            supply: { id: supply2.id },
            amount: 1500,
            total: 90_000,
          } as ShoppingSuppliesDetailsDto,
        ],
      };
      const data3: CreateShoppingSuppliesDto = {
        date: new Date(
          new Date().setDate(new Date().getDate() + 10),
        ).toISOString(),
        total: 180_000,
        details: [
          {
            supplier: { id: supplier2.id },
            supply: { id: supply2.id },
            amount: 3000,
            total: 180_000,
          } as ShoppingSuppliesDetailsDto,
        ],
      };

      for (let i = 0; i < 6; i++) {
        await shoppingService.createShopping(data1);
        await shoppingService.createShopping(data2);
        await shoppingService.createShopping(data3);
      }
    }, 10_000);

    it('should throw an exception for not sending a JWT to the protected path /shopping/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/shopping/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /shopping/all', async () => {
      await authService.removePermission(
        userTest.id,
        'find_all_supplies_shopping',
      );
      const response = await request
        .default(app.getHttpServer())
        .get('/shopping/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get only 10 shopping for default by not sending paging parameters', async () => {
      await authService.addPermission(
        userTest.id,
        'find_all_supplies_shopping',
      );
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
        expect(shopping).toHaveProperty('total');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('total');
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
        expect(shopping).toHaveProperty('total');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('total');
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
        expect(shopping).toHaveProperty('total');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('total');
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
        expect(shopping).toHaveProperty('total');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('total');
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
        expect(shopping).toHaveProperty('total');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('total');
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
        expect(shopping).toHaveProperty('total');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('total');
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
        date: new Date().toISOString(),
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
        expect(shopping).toHaveProperty('total');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('total');
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
        date: new Date(
          new Date().setDate(new Date().getDate() + 1),
        ).toISOString(),
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
        expect(shopping).toHaveProperty('total');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('total');
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
        date: new Date(
          new Date().setDate(new Date().getDate() + 5),
        ).toISOString(),
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
        expect(shopping).toHaveProperty('total');
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('total');
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
    it('should return the specified number of shopping passed by the query (equal total)', async () => {
      const queryData = {
        filter_by_total: true,
        type_filter_total: TypeFilterNumber.EQUAL,
        total: 60_000,
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
        expect(shopping).toHaveProperty('total');
        expect(shopping.total).toBe(queryData.total);
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('total');
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
    it('should return the specified number of shopping passed by the query (max total)', async () => {
      const queryData = {
        filter_by_total: true,
        type_filter_total: TypeFilterNumber.MAX,
        total: 60_000,
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
        expect(shopping).toHaveProperty('total');
        expect(shopping.total).toBeGreaterThan(queryData.total);
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('total');
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
    it('should return the specified number of shopping passed by the query (min total)', async () => {
      const queryData = {
        filter_by_total: true,
        type_filter_total: TypeFilterNumber.MIN,
        total: 180_000,
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
        expect(shopping).toHaveProperty('total');
        expect(shopping.total).toBeLessThan(queryData.total);
        expect(shopping).toHaveProperty('createdDate');
        expect(shopping).toHaveProperty('updatedDate');
        expect(shopping).toHaveProperty('deletedDate');
        expect(shopping.deletedDate).toBeNull();
        expect(shopping).toHaveProperty('details');
        expect(shopping.details.length).toBeGreaterThan(0);
        shopping.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('total');
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
      let dateShopping1 = new Date(
        new Date().setDate(new Date().getDate() + 3),
      ).toISOString();
      let dateShopping2 = new Date().toISOString();

      beforeAll(async () => {
        const data1: CreateShoppingSuppliesDto = {
          date: dateShopping1,
          total: 360_000,
          details: [
            {
              supplier: { id: supplier1.id },
              supply: { id: supply1.id },
              amount: 3000,
              total: 180_000,
            } as ShoppingSuppliesDetailsDto,
            {
              supplier: { id: supplier2.id },
              supply: { id: supply2.id },
              amount: 3000,
              total: 180_000,
            } as ShoppingSuppliesDetailsDto,
          ],
        };

        const data2: CreateShoppingSuppliesDto = {
          date: dateShopping1,
          total: 300_000,
          details: [
            {
              supplier: { id: supplier1.id },
              supply: { id: supply1.id },
              amount: 2500,
              total: 150_000,
            } as ShoppingSuppliesDetailsDto,
            {
              supplier: { id: supplier2.id },
              supply: { id: supply2.id },
              amount: 2500,
              total: 150_000,
            } as ShoppingSuppliesDetailsDto,
          ],
        };

        const shopping1 = await shoppingController.create(data1);
        const shopping2 = await shoppingController.create(data2);
      }, 10_000);

      it('should return the specified number of shopping passed by the query (EQUAL date, total, supplies, suppliers)', async () => {
        const queryData = {
          filter_by_date: true,
          type_filter_date: TypeFilterDate.EQUAL,
          date: dateShopping1,

          filter_by_total: true,
          type_filter_total: TypeFilterNumber.EQUAL,
          total: 300_000,

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
          expect(shopping).toHaveProperty('total');
          expect(shopping.total).toBe(queryData.total);
          expect(shopping).toHaveProperty('createdDate');
          expect(shopping).toHaveProperty('updatedDate');
          expect(shopping).toHaveProperty('deletedDate');
          expect(shopping.deletedDate).toBeNull();
          expect(shopping).toHaveProperty('details');
          expect(shopping.details.length).toBeGreaterThan(0);
          shopping.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('total');
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

      it('should return the specified number of shopping passed by the query (MAX date, total, supplies, suppliers)', async () => {
        const queryData = {
          filter_by_date: true,
          type_filter_date: TypeFilterDate.AFTER,
          date: dateShopping2,

          filter_by_total: true,
          type_filter_total: TypeFilterNumber.MAX,
          total: 60_000,

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
          expect(shopping).toHaveProperty('total');
          expect(shopping.total).toBeGreaterThan(queryData.total);
          expect(shopping).toHaveProperty('createdDate');
          expect(shopping).toHaveProperty('updatedDate');
          expect(shopping).toHaveProperty('deletedDate');
          expect(shopping.deletedDate).toBeNull();
          expect(shopping).toHaveProperty('details');
          expect(shopping.details.length).toBeGreaterThan(0);
          shopping.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('total');
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
      it('should return the specified number of shopping passed by the query (MIN date, total, supplies, suppliers)', async () => {
        const queryData = {
          filter_by_date: true,
          type_filter_date: TypeFilterDate.BEFORE,
          date: dateShopping1,

          filter_by_total: true,
          type_filter_total: TypeFilterNumber.MIN,
          total: 360_000,

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
          expect(shopping).toHaveProperty('total');
          expect(shopping.total).toBeLessThan(queryData.total);
          expect(shopping).toHaveProperty('createdDate');
          expect(shopping).toHaveProperty('updatedDate');
          expect(shopping).toHaveProperty('deletedDate');
          expect(shopping.deletedDate).toBeNull();
          expect(shopping).toHaveProperty('details');
          expect(shopping.details.length).toBeGreaterThan(0);
          shopping.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('total');
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
    const shoppingId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path shopping/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/one/${shoppingId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action shopping/one/:id', async () => {
      await authService.removePermission(
        userTest.id,
        'find_one_supplies_shopping',
      );
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/one/${shoppingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get one shopping', async () => {
      await authService.addPermission(
        userTest.id,
        'find_one_supplies_shopping',
      );

      const record = (
        await shoppingService.findAllShopping({
          limit: 1,
        })
      ).records[0];

      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const shopping = response.body;
      expect(shopping).toHaveProperty('id');
      expect(shopping).toHaveProperty('date');
      expect(shopping).toHaveProperty('total');
      expect(shopping).toHaveProperty('createdDate');
      expect(shopping).toHaveProperty('updatedDate');
      expect(shopping).toHaveProperty('deletedDate');
      expect(shopping.deletedDate).toBeNull();
      expect(shopping).toHaveProperty('details');
      expect(shopping.details.length).toBeGreaterThan(0);
      shopping.details.forEach((detail) => {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('total');
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
        .get(`/shopping/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Supplies Shopping with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
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
    const shoppingId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path shopping/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/shopping/update/one/${shoppingId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action shopping/update/one/:id', async () => {
      await authService.removePermission(
        userTest.id,
        'find_one_supplies_shopping',
      );
      const response = await request
        .default(app.getHttpServer())
        .patch(`/shopping/update/one/${shoppingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should update one shopping', async () => {
      await authService.addPermission(
        userTest.id,
        'update_one_supplies_shopping',
      );

      const record = (
        await shoppingService.findAllShopping({
          limit: 1,
        })
      ).records[0];

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const bodyRequest: UpdateSuppliesShoppingDto = {
        ...rest,
        total: rest.total + 2000 * record.details.length,
        details: record.details.map((detail) => ({
          id: detail.id,
          supplier: { id: detail.supplier.id },
          supply: { id: detail.supply.id },
          amount: detail.amount + 500,
          total: detail.total + 2000,
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
      expect(body).toHaveProperty('total');
      expect(body.total).toBe(bodyRequest.total);
      expect(body).toHaveProperty('createdDate');
      expect(body).toHaveProperty('updatedDate');
      expect(body).toHaveProperty('deletedDate');
      expect(body.deletedDate).toBeNull();

      expect(body).toHaveProperty('details');
      expect(body.details.length).toBeGreaterThan(0);
      body.details.forEach((detail) => {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('total');
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
      await authService.addPermission(
        userTest.id,
        'update_one_supplies_shopping',
      );

      const [supplier1, supplier2] = (await supplierController.findAll({}))
        .records;
      const [supply1, supply2] = (await suppliesService.findAll({})).records;

      const data: CreateShoppingSuppliesDto = {
        date: new Date().toISOString(),

        total: 120_000,
        details: [
          {
            supplier: { id: supplier1.id },
            supply: { id: supply1.id },
            amount: 1000,
            total: 60_000,
          } as ShoppingSuppliesDetailsDto,
          {
            supplier: { id: supplier2.id },
            supply: { id: supply2.id },
            amount: 1000,
            total: 60_000,
          } as ShoppingSuppliesDetailsDto,
        ],
      };

      const record = await shoppingService.createShopping(data);

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const idShoppingDetail = record.details[0].id;

      await shoppingDetailsRepository.softDelete(idShoppingDetail);

      const bodyRequest = {
        ...rest,
        total: 60_000,
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
      await authService.addPermission(
        userTest.id,
        'update_one_supplies_shopping',
      );

      const record = (
        await shoppingService.findAllShopping({
          limit: 1,
        })
      ).records[0];

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
      await authService.addPermission(
        userTest.id,
        'update_one_supplies_shopping',
      );
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/shopping/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: new Date().toISOString() })
        .expect(404);
      expect(body.message).toEqual(
        'Supplies Shopping with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/shopping/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
  });

  describe('shopping/export/one/pdf/:id (GET)', () => {
    const shoppingId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path shopping/export/one/pdf/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/shopping/export/one/pdf/:id')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action shopping/export/one/pdf/:id', async () => {
      await authService.removePermission(userTest.id, 'export_shopping_to_pdf');
      const response = await request
        .default(app.getHttpServer())
        .get(`/shopping/export/one/pdf/${shoppingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should export one shopping in PDF format', async () => {
      await authService.addPermission(userTest.id, 'export_shopping_to_pdf');
      const record = (
        await shoppingService.findAllShopping({
          limit: 1,
        })
      ).records[0];
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
    const shoppingId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path shopping/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/shopping/remove/one/${shoppingId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action shopping/remove/one/:id', async () => {
      await authService.removePermission(
        userTest.id,
        'remove_one_supplies_shopping',
      );
      const response = await request
        .default(app.getHttpServer())
        .delete(`/shopping/remove/one/${shoppingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete one shopping', async () => {
      await authService.addPermission(
        userTest.id,
        'remove_one_supplies_shopping',
      );
      const { id, details } = (
        await shoppingService.findAllShopping({
          limit: 1,
        })
      ).records[0];

      const suppliesID = details.map((detail) => detail.supply.id);

      const previousStock = await Promise.all(
        suppliesID.map(async (supplyID) => {
          const { id, name, stock } = await suppliesService.findOne(supplyID);
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
          const { id, name, stock } = await suppliesService.findOne(supplyID);
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
        .delete(`/shopping/remove/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Supplies Shopping with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });
  });

  describe('shopping/remove/bulk (DELETE)', () => {
    it('should throw an exception for not sending a JWT to the protected path shopping/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/shopping/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action shopping/remove/bulk ', async () => {
      await authService.removePermission(
        userTest.id,
        'remove_bulk_supplies_shopping',
      );
      const response = await request
        .default(app.getHttpServer())
        .delete('/shopping/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete shopping bulk', async () => {
      await authService.addPermission(
        userTest.id,
        'remove_bulk_supplies_shopping',
      );
      const [shopping1, shopping2, shopping3] = (
        await shoppingService.findAllShopping({
          limit: 3,
          offset: 0,
        })
      ).records;

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
});
