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

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { Supply } from 'src/supplies/entities';
import { SuppliesController } from 'src/supplies/supplies.controller';
import { SuppliesModule } from 'src/supplies/supplies.module';
import * as request from 'supertest';
import { ConsumptionsController } from './consumptions.controller';
import { ConsumptionsService } from './consumptions.service';
import { ConsumptionSuppliesDetailsDto } from './dto/consumption-supplies-details.dto';
import { ConsumptionSuppliesDto } from './dto/consumption-supplies.dto';
import { SuppliesConsumptionDetails } from './entities/supplies-consumption-details.entity';
import { SuppliesConsumption } from './entities/supplies-consumption.entity';
import { ConsumptionsModule } from './consumptions.module';
import { Crop } from 'src/crops/entities/crop.entity';

describe('ConsumptionController (e2e)', () => {
  let app: INestApplication;

  let consumptionRepository: Repository<SuppliesConsumption>;
  let consumptionDetailsRepository: Repository<SuppliesConsumptionDetails>;

  let seedService: SeedService;
  let authService: AuthService;

  let consumptionService: ConsumptionsService;
  let consumptionController: ConsumptionsController;

  let suppliesController: SuppliesController;

  let userTest: User;
  let token: string;

  const consumptionDtoTemplete: ConsumptionSuppliesDto = {
    date: InformationGenerator.generateRandomDate({}),
    details: [
      {
        supply: { id: InformationGenerator.generateRandomId() },
        crop: { id: InformationGenerator.generateRandomId() },
        amount: 10_000,
      } as ConsumptionSuppliesDetailsDto,
    ],
  };

  const falseConsumptionId = InformationGenerator.generateRandomId();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        ConsumptionsModule,
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
              // logging: true,
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

    consumptionService =
      moduleFixture.get<ConsumptionsService>(ConsumptionsService);
    consumptionController = moduleFixture.get<ConsumptionsController>(
      ConsumptionsController,
    );
    suppliesController =
      moduleFixture.get<SuppliesController>(SuppliesController);

    app = moduleFixture.createNestApplication();

    consumptionRepository = moduleFixture.get<Repository<SuppliesConsumption>>(
      getRepositoryToken(SuppliesConsumption),
    );
    consumptionDetailsRepository = moduleFixture.get<
      Repository<SuppliesConsumptionDetails>
    >(getRepositoryToken(SuppliesConsumptionDetails));

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        errorHttpStatusCode: 400,
        transform: true,
      }),
    );

    await app.init();

    await consumptionRepository.delete({});

    userTest = await authService.createUserToTests();
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await app.close();
  });

  describe('consumptions/create (POST)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'create_supply_consumption');
    });

    it('should throw an exception for not sending a JWT to the protected path /consumptions/create', async () => {
      const bodyRequest: ConsumptionSuppliesDto = {
        ...consumptionDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/consumptions/create')
        .send(bodyRequest)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should create a new consumption', async () => {
      const [supply1, supply2] = (
        await seedService.CreateShoppingExtended({ quantitySupplies: 3 })
      ).supplies;

      const crop1: Crop = (await seedService.CreateCrop({})) as Crop;
      const crop2: Crop = (await seedService.CreateCrop({})) as Crop;

      const data: ConsumptionSuppliesDto = {
        date: InformationGenerator.generateRandomDate({}),
        details: [
          {
            crop: { id: crop1.id },
            supply: { id: supply1.id },
            amount: 2000,
          } as SuppliesConsumptionDetails,
          {
            crop: { id: crop2.id },
            supply: { id: supply2.id },
            amount: 2000,
          } as SuppliesConsumptionDetails,
        ],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/consumptions/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(201);

      expect(response.body).toMatchObject(data);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'date must be a valid ISO 8601 date string',
        'details should not be empty',
        'details must be an array',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/consumptions/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });
  });

  describe('consumptions/all (GET)', () => {
    let supply1: Supply;
    let supply2: Supply;
    let crop1: Crop;
    let crop2: Crop;

    beforeAll(async () => {
      await consumptionRepository.delete({});

      const supplies = (
        await seedService.CreateShoppingExtended({
          quantitySupplies: 2,
          amountForItem: 50_000,
        })
      ).supplies;

      supply1 = supplies[0] as Supply;
      supply2 = supplies[1] as Supply;

      const crops = await Promise.all([
        seedService.CreateCrop({}),
        seedService.CreateCrop({}),
      ]);

      crop1 = crops[0] as Crop;
      crop2 = crops[1] as Crop;

      const data1: ConsumptionSuppliesDto = {
        date: InformationGenerator.generateRandomDate({}),
        details: [
          {
            crop: { id: crop1.id },
            supply: { id: supply1.id },
            amount: 1000,
          } as ConsumptionSuppliesDetailsDto,
        ],
      };
      const data2: ConsumptionSuppliesDto = {
        date: InformationGenerator.generateRandomDate({ daysToAdd: 5 }),
        details: [
          {
            crop: { id: crop2.id },
            supply: { id: supply2.id },
            amount: 1500,
          } as ConsumptionSuppliesDetailsDto,
        ],
      };
      const data3: ConsumptionSuppliesDto = {
        date: InformationGenerator.generateRandomDate({ daysToAdd: 10 }),
        details: [
          {
            crop: { id: crop2.id },
            supply: { id: supply2.id },
            amount: 3000,
          } as ConsumptionSuppliesDetailsDto,
        ],
      };

      for (let i = 0; i < 6; i++) {
        await consumptionService.createConsumption(data1);
        await consumptionService.createConsumption(data2);
        await consumptionService.createConsumption(data3);
      }

      await authService.addPermission(
        userTest.id,
        'find_all_supplies_consumption',
      );
    }, 10_000);

    it('should throw an exception for not sending a JWT to the protected path /consumptions/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/consumptions/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    /* it('should throw an exception because the user JWT does not have permissions for this action /consumptions/all', async () => {
      await authService.removePermission(
        userTest.id,
        'find_all_supplies_consumption',
      );
      const response = await request
        .default(app.getHttpServer())
        .get('/consumptions/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    }); */

    it('should get only 10 consumption for default by not sending paging parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/consumptions/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });

    it('should return the specified number of consumption passed by the paging arguments by the URL (1)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/all`)
        .query({ limit: 11, offset: 0 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(11);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
      response.body.records.forEach((consumption: SuppliesConsumption) => {
        expect(consumption).toHaveProperty('id');
        expect(consumption).toHaveProperty('date');
        expect(consumption).toHaveProperty('createdDate');
        expect(consumption).toHaveProperty('updatedDate');
        expect(consumption).toHaveProperty('deletedDate');
        expect(consumption.deletedDate).toBeNull();
        expect(consumption).toHaveProperty('details');
        expect(consumption.details.length).toBeGreaterThan(0);
        consumption.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('crop');
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');

          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });
    it('should return the specified number of consumption passed by the paging arguments by the URL (2)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/all`)
        .query({ limit: 11, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(7);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(2);
      response.body.records.forEach((consumption: SuppliesConsumption) => {
        expect(consumption).toHaveProperty('id');
        expect(consumption).toHaveProperty('date');
        expect(consumption).toHaveProperty('createdDate');
        expect(consumption).toHaveProperty('updatedDate');
        expect(consumption).toHaveProperty('deletedDate');
        expect(consumption.deletedDate).toBeNull();
        expect(consumption).toHaveProperty('details');
        expect(consumption.details.length).toBeGreaterThan(0);
        consumption.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('crop');
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');

          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });
    it('should return the specified number of consumption passed by the query (includes supply)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/all`)
        .query({ supplies: supply2.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((consumption: SuppliesConsumption) => {
        expect(consumption).toHaveProperty('id');
        expect(consumption).toHaveProperty('date');
        expect(consumption).toHaveProperty('createdDate');
        expect(consumption).toHaveProperty('updatedDate');
        expect(consumption).toHaveProperty('deletedDate');
        expect(consumption.deletedDate).toBeNull();
        expect(consumption).toHaveProperty('details');
        expect(consumption.details.length).toBeGreaterThan(0);
        consumption.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('crop');
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');

          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });
    it('should return the specified number of consumption passed by the query (includes supply)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/all`)
        .query({ supplies: supply1.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((consumption: SuppliesConsumption) => {
        expect(consumption).toHaveProperty('id');
        expect(consumption).toHaveProperty('date');
        expect(consumption).toHaveProperty('createdDate');
        expect(consumption).toHaveProperty('updatedDate');
        expect(consumption).toHaveProperty('deletedDate');
        expect(consumption.deletedDate).toBeNull();
        expect(consumption).toHaveProperty('details');
        expect(consumption.details.length).toBeGreaterThan(0);
        consumption.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('crop');
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');

          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });

    it('should return the specified number of consumption passed by the query (includes supplier)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/all`)
        .query({ crops: crop1.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((consumption: SuppliesConsumption) => {
        expect(consumption).toHaveProperty('id');
        expect(consumption).toHaveProperty('date');
        expect(consumption).toHaveProperty('createdDate');
        expect(consumption).toHaveProperty('updatedDate');
        expect(consumption).toHaveProperty('deletedDate');
        expect(consumption.deletedDate).toBeNull();
        expect(consumption).toHaveProperty('details');
        expect(consumption.details.length).toBeGreaterThan(0);
        consumption.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('crop');
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');

          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });

    it('should return the specified number of consumption passed by the query (includes supplier)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/all`)
        .query({ crops: crop2.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((consumption: SuppliesConsumption) => {
        expect(consumption).toHaveProperty('id');
        expect(consumption).toHaveProperty('date');
        expect(consumption).toHaveProperty('createdDate');
        expect(consumption).toHaveProperty('updatedDate');
        expect(consumption).toHaveProperty('deletedDate');
        expect(consumption.deletedDate).toBeNull();
        expect(consumption).toHaveProperty('details');
        expect(consumption.details.length).toBeGreaterThan(0);
        consumption.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('crop');
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');

          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });

    it('should return the specified number of consumption passed by the query (after date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.AFTER,
        date: InformationGenerator.generateRandomDate({}),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((consumption: SuppliesConsumption) => {
        expect(consumption).toHaveProperty('id');
        expect(consumption).toHaveProperty('date');
        expect(new Date(consumption.date) > new Date(queryData.date)).toBe(
          true,
        );
        expect(consumption).toHaveProperty('createdDate');
        expect(consumption).toHaveProperty('updatedDate');
        expect(consumption).toHaveProperty('deletedDate');
        expect(consumption.deletedDate).toBeNull();
        expect(consumption).toHaveProperty('details');
        expect(consumption.details.length).toBeGreaterThan(0);
        consumption.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('crop');
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');

          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });
    it('should return the specified number of consumption passed by the query (before date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.BEFORE,
        date: InformationGenerator.generateRandomDate({ daysToAdd: 1 }),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((consumption: SuppliesConsumption) => {
        expect(consumption).toHaveProperty('id');
        expect(consumption).toHaveProperty('date');
        expect(new Date(consumption.date) < new Date(queryData.date)).toBe(
          true,
        );
        expect(consumption).toHaveProperty('createdDate');
        expect(consumption).toHaveProperty('updatedDate');
        expect(consumption).toHaveProperty('deletedDate');
        expect(consumption.deletedDate).toBeNull();
        expect(consumption).toHaveProperty('details');
        expect(consumption.details.length).toBeGreaterThan(0);
        consumption.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('crop');
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');

          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });
    it('should return the specified number of consumption passed by the query (equal date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.EQUAL,
        date: InformationGenerator.generateRandomDate({ daysToAdd: 5 }),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((consumption: SuppliesConsumption) => {
        expect(consumption).toHaveProperty('id');
        expect(consumption).toHaveProperty('date');
        expect(consumption.date.split('T')[0]).toBe(
          new Date(queryData.date).toISOString().split('T')[0],
        );
        expect(consumption).toHaveProperty('createdDate');
        expect(consumption).toHaveProperty('updatedDate');
        expect(consumption).toHaveProperty('deletedDate');
        expect(consumption.deletedDate).toBeNull();
        expect(consumption).toHaveProperty('details');
        expect(consumption.details.length).toBeGreaterThan(0);
        consumption.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('crop');
          expect(detail.crop).toHaveProperty('id');
          expect(detail.crop).toHaveProperty('name');

          expect(detail).toHaveProperty('supply');
          expect(detail.supply).toBeDefined();
          expect(detail.supply).toHaveProperty('id');
          expect(detail.supply).toHaveProperty('name');
        });
      });
    });

    describe('should return the specified number of consumption passed by the query mix filter', () => {
      let dateConsumption1 = InformationGenerator.generateRandomDate({ daysToAdd: 3 });
      let dateConsumption2 = InformationGenerator.generateRandomDate({});

      beforeAll(async () => {
        const data1: ConsumptionSuppliesDto = {
          date: dateConsumption1,
          details: [
            {
              crop: { id: crop1.id },
              supply: { id: supply1.id },
              amount: 3000,
            } as ConsumptionSuppliesDetailsDto,
            {
              crop: { id: crop2.id },
              supply: { id: supply2.id },
              amount: 3000,
            } as ConsumptionSuppliesDetailsDto,
          ],
        };

        const data2: ConsumptionSuppliesDto = {
          date: dateConsumption1,
          details: [
            {
              crop: { id: crop1.id },
              supply: { id: supply1.id },
              amount: 2500,
            } as ConsumptionSuppliesDetailsDto,
            {
              crop: { id: crop2.id },
              supply: { id: supply2.id },
              amount: 2500,
            } as ConsumptionSuppliesDetailsDto,
          ],
        };

        await Promise.all([
          consumptionController.create(data1),
          consumptionController.create(data2),
        ]);
      }, 10_000);

      it('should return the specified number of consumption passed by the query (EQUAL date, supplies, crops)', async () => {
        const queryData = {
          filter_by_date: true,
          type_filter_date: TypeFilterDate.EQUAL,
          date: dateConsumption1,

          supplies: supply1.id,
          crops: crop1.id,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/consumptions/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(2);
        expect(response.body.current_row_count).toEqual(2);
        expect(response.body.total_page_count).toEqual(1);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((consumption: SuppliesConsumption) => {
          expect(consumption).toHaveProperty('id');
          expect(consumption).toHaveProperty('date');
          expect(consumption.date.split('T')[0]).toBe(
            new Date(queryData.date).toISOString().split('T')[0],
          );
          expect(consumption).toHaveProperty('createdDate');
          expect(consumption).toHaveProperty('updatedDate');
          expect(consumption).toHaveProperty('deletedDate');
          expect(consumption.deletedDate).toBeNull();
          expect(consumption).toHaveProperty('details');
          expect(consumption.details.length).toBeGreaterThan(0);
          consumption.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('crop');
            expect(detail.crop).toBeDefined();
            expect(detail.crop).toHaveProperty('id');

            expect(detail).toHaveProperty('supply');
            expect(detail.supply).toBeDefined();
            expect(detail.supply).toHaveProperty('id');

            expect(detail.supply).toHaveProperty('name');
          });

          const flatSupplies = consumption.details.map(
            (detail) => detail.supply.id,
          );

          expect(flatSupplies).toContain(queryData.supplies);

          const flatCrops = consumption.details.map((detail) => detail.crop.id);

          expect(flatCrops).toContain(queryData.crops);
        });
      });

      it('should return the specified number of consumption passed by the query (MAX date, supplies, crops)', async () => {
        const queryData = {
          filter_by_date: true,
          type_filter_date: TypeFilterDate.AFTER,
          date: dateConsumption2,

          supplies: supply2.id,
          crops: crop2.id,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/consumptions/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(14);
        expect(response.body.current_row_count).toEqual(10);
        expect(response.body.total_page_count).toEqual(2);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((consumption: SuppliesConsumption) => {
          expect(consumption).toHaveProperty('id');
          expect(consumption).toHaveProperty('date');
          expect(new Date(consumption.date) > new Date(queryData.date)).toBe(
            true,
          );

          expect(consumption).toHaveProperty('createdDate');
          expect(consumption).toHaveProperty('updatedDate');
          expect(consumption).toHaveProperty('deletedDate');
          expect(consumption.deletedDate).toBeNull();
          expect(consumption).toHaveProperty('details');
          expect(consumption.details.length).toBeGreaterThan(0);
          consumption.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('crop');
            expect(detail.crop).toBeDefined();
            expect(detail.crop).toHaveProperty('id');
            expect(detail.crop).toHaveProperty('name');
            expect(detail.supply).toBeDefined();
            expect(detail.supply).toHaveProperty('id');
            expect(detail.supply).toHaveProperty('name');
          });

          const flatSupplies = consumption.details.map(
            (detail) => detail.supply.id,
          );

          expect(flatSupplies).toContain(queryData.supplies);

          const flatCrops = consumption.details.map((detail) => detail.crop.id);

          expect(flatCrops).toContain(queryData.crops);
        });
      });
      it('should return the specified number of consumption passed by the query (MIN date, supplies, crops)', async () => {
        const queryData = {
          filter_by_date: true,
          type_filter_date: TypeFilterDate.BEFORE,
          date: dateConsumption1,

          supplies: supply1.id,
          crops: crop1.id,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/consumptions/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(6);
        expect(response.body.current_row_count).toEqual(6);
        expect(response.body.total_page_count).toEqual(1);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((consumption: SuppliesConsumption) => {
          expect(consumption).toHaveProperty('id');
          expect(consumption).toHaveProperty('date');
          expect(new Date(consumption.date) < new Date(queryData.date)).toBe(
            true,
          );

          expect(consumption).toHaveProperty('createdDate');
          expect(consumption).toHaveProperty('updatedDate');
          expect(consumption).toHaveProperty('deletedDate');
          expect(consumption.deletedDate).toBeNull();
          expect(consumption).toHaveProperty('details');
          expect(consumption.details.length).toBeGreaterThan(0);
          consumption.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('crop');
            expect(detail.crop).toBeDefined();
            expect(detail.crop).toHaveProperty('id');
            expect(detail.crop).toHaveProperty('name');
            expect(detail.supply).toBeDefined();
            expect(detail.supply).toHaveProperty('id');
            expect(detail.supply).toHaveProperty('name');
          });

          const flatSupplies = consumption.details.map(
            (detail) => detail.supply.id,
          );

          expect(flatSupplies).toContain(queryData.supplies);

          const flatCrops = consumption.details.map((detail) => detail.crop.id);

          expect(flatCrops).toContain(queryData.crops);
        });
      });
    });

    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/consumptions/all')
        .query({ offset: 10 })
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no consumption records with the requested pagination',
      );
    });
  });

  describe('consumptions/one/:id (GET)', () => {
    beforeAll(async () => {
      await authService.addPermission(
        userTest.id,
        'find_one_supplies_consumption',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path consumptions/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/one/${falseConsumptionId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    /* it('should throw an exception because the user JWT does not have permissions for this action consumptions/one/:id', async () => {
      await authService.removePermission(
        userTest.id,
        'find_one_supplies_consumption',
      );
      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/one/${falseConsumptionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    }); */

    it('should get one consumption', async () => {
      const record = (await seedService.CreateConsumption({})).consumption;

      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const consumption = response.body;
      expect(consumption).toHaveProperty('id');
      expect(consumption).toHaveProperty('date');
      expect(consumption).toHaveProperty('createdDate');
      expect(consumption).toHaveProperty('updatedDate');
      expect(consumption).toHaveProperty('deletedDate');
      expect(consumption.deletedDate).toBeNull();
      expect(consumption).toHaveProperty('details');
      expect(consumption.details.length).toBeGreaterThan(0);
      consumption.details.forEach((detail) => {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('amount');
        expect(detail).toHaveProperty('crop');
        expect(detail.crop).toBeDefined();
        expect(detail.crop).toHaveProperty('id');
        expect(detail.crop).toHaveProperty('name');
        expect(detail.supply).toHaveProperty('id');
        expect(detail.supply).toHaveProperty('name');
      });
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/consumptions/one/1234`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });

    it('should throw exception for not finding consumption by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/consumptions/one/${falseConsumptionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Supplies consumption with id: ${falseConsumptionId} not found`,
      );
    });

    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/consumptions/one/`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('consumptions/update/one/:id (PATCH)', () => {
    beforeAll(async () => {
      await authService.addPermission(
        userTest.id,
        'update_one_supplies_consumption',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path consumptions/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/consumptions/update/one/${falseConsumptionId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    /*  it('should throw an exception because the user JWT does not have permissions for this action consumptions/update/one/:id', async () => {
      await authService.removePermission(
        userTest.id,
        'find_one_supplies_consumption',
      );
      const response = await request
        .default(app.getHttpServer())
        .patch(`/consumptions/update/one/${falseConsumptionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    }); */

    it('should update one consumption', async () => {
      const supply = await seedService.CreateSupply({});

      await seedService.CreateShopping({ supplyId: supply.id, amount: 4500 });

      const record = (
        await seedService.CreateConsumption({
          supplyId: supply.id,
          amount: 4000,
        })
      ).consumption;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const bodyRequest: ConsumptionSuppliesDto = {
        ...rest,
        details: record.details.map((detail) => ({
          id: detail.id,
          crop: { id: detail.crop.id },
          supply: { id: detail.supply.id },
          amount: detail.amount + 500,
        })) as ConsumptionSuppliesDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/consumptions/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(200);

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('date');

      expect(body).toHaveProperty('createdDate');
      expect(body).toHaveProperty('updatedDate');
      expect(body).toHaveProperty('deletedDate');
      expect(body.deletedDate).toBeNull();

      expect(body).toHaveProperty('details');
      expect(body.details.length).toBeGreaterThan(0);
      body.details.forEach((detail) => {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('amount');
        expect(detail).toHaveProperty('crop');
        expect(detail.crop).toBeDefined();
        expect(detail.crop).toHaveProperty('id');
        expect(detail.crop).toHaveProperty('name');
        expect(detail.supply).toHaveProperty('id');
        expect(detail.supply).toHaveProperty('name');
      });
    });

    it('Should throw an exception when trying to update an amount higher than allowed', async () => {
      const supply = await seedService.CreateSupply({});

      await seedService.CreateShopping({ supplyId: supply.id, amount: 4500 });

      const record = (
        await seedService.CreateConsumption({
          supplyId: supply.id,
          amount: 4000,
        })
      ).consumption;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const bodyRequest: ConsumptionSuppliesDto = {
        ...rest,
        details: record.details.map((detail) => ({
          id: detail.id,
          crop: { id: detail.crop.id },
          supply: { id: detail.supply.id },
          amount: detail.amount + 5000,
        })) as ConsumptionSuppliesDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/consumptions/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `Insufficient supply stock, only ${4500} ${supply.unit_of_measure} are in ${supply.name}`,
      );
    });

    it('You should throw an exception for attempting to delete a record that has been cascaded out.', async () => {
      const record = (
        await seedService.CreateConsumptionExtended({ quantitySupplies: 3 })
      ).consumption;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const idConsumptionDetail = record.details[0].id;

      await consumptionDetailsRepository.softDelete(idConsumptionDetail);

      const bodyRequest = {
        ...rest,
        details: record.details
          .filter((detail) => detail.id !== idConsumptionDetail)
          .map(({ createdDate, updatedDate, deletedDate, ...rest }) => ({
            ...rest,
          })) as ConsumptionSuppliesDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/consumptions/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot delete the record with id ${record.details[0].id}, it is linked to other records.`,
      );
    });

    it('You should throw an exception for attempting to modify a record that has been cascaded out.', async () => {
      const record = (await seedService.CreateConsumptionExtended({}))
        .consumption;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      await consumptionDetailsRepository.softDelete(record.details[0].id);

      const bodyRequest = {
        ...rest,
        details: record.details.map(
          ({ createdDate, updatedDate, deletedDate, ...rest }) => ({
            ...rest,
            // amount: rest.amount + 100,
            amount: rest.amount - 100,
            crop: { id: rest.crop.id },
            supply: { id: rest.supply.id },
          }),
        ) as ConsumptionSuppliesDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/consumptions/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot update the record with id ${record.details[0].id} , it is linked to other records.`,
      );
    });

    it('should throw exception for not finding consumption to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/consumptions/update/one/${falseConsumptionId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(consumptionDtoTemplete)
        .expect(404);
      expect(body.message).toEqual(
        `Supplies consumption with id: ${falseConsumptionId} not found`,
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/consumptions/update/one/${falseConsumptionId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
  });

  describe('consumptions/remove/one/:id (DELETE)', () => {
    beforeAll(async () => {
      await authService.addPermission(
        userTest.id,
        'remove_one_supplies_consumption',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path consumptions/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/consumptions/remove/one/${falseConsumptionId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete one consumption', async () => {
      const { id, details } = (await seedService.CreateConsumption({}))
        .consumption;

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
        .delete(`/consumptions/remove/one/${id}`)
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
        expect(currentSupply.stock.amount).toBeGreaterThan(supply.stock.amount);

        const { amount: consumptionAmount } = details.find(
          (detail) => detail.supply.id === supply.id,
        );

        expect(currentSupply.stock.amount).toBe(
          supply.stock.amount + consumptionAmount,
        );
      });

      const consumption = await consumptionRepository.findOne({
        where: { id },
      });

      expect(consumption).toBeNull();
    });

    it('You should throw exception for trying to delete a consumption that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/consumptions/remove/one/${falseConsumptionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Supplies consumption with id: ${falseConsumptionId} not found`,
      );
    });
  });

  describe('consumptions/remove/bulk (DELETE)', () => {
    beforeAll(async () => {
      await authService.addPermission(
        userTest.id,
        'remove_bulk_supplies_consumption',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path consumptions/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/consumptions/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete consumption bulk', async () => {
      const [
        { consumption: consumption1 },
        { consumption: consumption2 },
        { consumption: consumption3 },
      ] = await Promise.all([
        seedService.CreateConsumption({}),
        seedService.CreateConsumption({}),
        seedService.CreateConsumption({}),
      ]);

      const bulkData: RemoveBulkRecordsDto<SuppliesConsumption> = {
        recordsIds: [{ id: consumption1.id }, { id: consumption2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/consumptions/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(bulkData)
        .expect(200);

      const [deletedConsumption1, deletedConsumption2, remainingConsumption3] =
        await Promise.all([
          consumptionRepository.findOne({ where: { id: consumption1.id } }),
          consumptionRepository.findOne({ where: { id: consumption2.id } }),
          consumptionRepository.findOne({ where: { id: consumption3.id } }),
        ]);

      expect(deletedConsumption1).toBeNull();
      expect(deletedConsumption2).toBeNull();
      expect(remainingConsumption3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/consumptions/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });
  });

  describe('should throw an exception because the user JWT does not have permissions for these actions', () => {
    beforeAll(async () => {
      await Promise.all([
        authService.removePermission(userTest.id, 'create_supply_consumption'),
        authService.removePermission(
          userTest.id,
          'find_all_supplies_consumption',
        ),
        authService.removePermission(
          userTest.id,
          'find_one_supplies_consumption',
        ),
        authService.removePermission(
          userTest.id,
          'update_one_supplies_consumption',
        ),
        authService.removePermission(
          userTest.id,
          'remove_one_supplies_consumption',
        ),
        authService.removePermission(
          userTest.id,
          'remove_bulk_supplies_consumption',
        ),
      ]);
    });

    it('should throw an exception because the user JWT does not have permissions for this action /consumptions/create', async () => {
      const bodyRequest: ConsumptionSuppliesDto = {
        ...consumptionDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/consumptions/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /consumptions/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/consumptions/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /consumptions/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/consumptions/one/${falseConsumptionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /consumptions/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/consumptions/update/one/${falseConsumptionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /consumptions/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/consumptions/remove/one/${falseConsumptionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /consumptions/remove/bulk', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/consumptions/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });
});
