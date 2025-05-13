import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { HarvestDetailsDto } from './dto/harvest-details.dto';
import { HarvestDto } from './dto/harvest.dto';
import { Harvest } from './entities/harvest.entity';
import { HarvestController } from './harvest.controller';
import { HarvestModule } from './harvest.module';

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { HarvestProcessedDto } from './dto/harvest-processed.dto';
import { HarvestDetails } from './entities/harvest-details.entity';
import { HarvestProcessed } from './entities/harvest-processed.entity';

describe('HarvestsController (e2e)', () => {
  let app: INestApplication;
  let harvestRepository: Repository<Harvest>;
  let harvestDetailsRepository: Repository<HarvestDetails>;
  let harvestProcessedRepository: Repository<HarvestProcessed>;
  let seedService: SeedService;
  let authService: AuthService;

  let harvestController: HarvestController;
  let userTest: User;
  let token: string;

  const harvestDtoTemplete: HarvestDto = {
    date: InformationGenerator.generateRandomDate({}),
    crop: { id: InformationGenerator.generateRandomId() },
    amount: 150,
    value_pay: 90_000,
    observation: InformationGenerator.generateObservation(),
    details: [
      {
        employee: { id: InformationGenerator.generateRandomId() },
        amount: 150,
        value_pay: 90_000,
      } as HarvestDetailsDto,
    ],
  };

  const harvestProcessedTemplateDto: HarvestProcessedDto = {
    date: InformationGenerator.generateRandomDate({}),
    crop: { id: InformationGenerator.generateRandomId() },
    harvest: { id: InformationGenerator.generateRandomId() },
    amount: 50,
  };

  const falseHarvestId = InformationGenerator.generateRandomId();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        HarvestModule,
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
    harvestController = moduleFixture.get<HarvestController>(HarvestController);

    harvestRepository = moduleFixture.get<Repository<Harvest>>(
      getRepositoryToken(Harvest),
    );
    harvestDetailsRepository = moduleFixture.get<Repository<HarvestDetails>>(
      getRepositoryToken(HarvestDetails),
    );
    harvestProcessedRepository = moduleFixture.get<
      Repository<HarvestProcessed>
    >(getRepositoryToken(HarvestProcessed));

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

    await harvestRepository.delete({});
    userTest = await authService.createUserToTests();
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await app.close();
  });

  describe('harvests/create (POST)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'create_harvest');
    });

    it('should throw an exception for not sending a JWT to the protected path /harvests/create', async () => {
      const bodyRequest: HarvestDto = {
        ...harvestDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/harvests/create')
        .send(bodyRequest)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should create a new harvest', async () => {
      const crop = await seedService.CreateCrop({});

      const employee1 = await seedService.CreateEmployee({});
      const employee2 = await seedService.CreateEmployee({});

      const bodyRequest: HarvestDto = {
        ...harvestDtoTemplete,
        crop: { id: crop.id },
        amount: 200,
        value_pay: 120_000,
        details: [
          {
            employee: { id: employee1.id },
            amount: 100,
            value_pay: 60_000,
          } as HarvestDetailsDto,
          {
            employee: { id: employee2.id },
            amount: 100,
            value_pay: 60_000,
          } as HarvestDetailsDto,
        ],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/harvests/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(201);
      expect(response.body).toMatchObject(bodyRequest);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'date must be a valid ISO 8601 date string',
        'crop should not be null or undefined',
        'amount must be a positive number',
        'amount must be an integer number',
        'value_pay must be a positive number',
        'value_pay must be an integer number',
        'observation must be a string',
        'The array contains duplicate employees. Each employee id must be unique.',
        "The sum of fields [amount, value_pay] in 'details' must match the corresponding top-level values.",
        'details should not be empty',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/harvests/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });
  });

  describe('harvests/all (GET)', () => {
    let crop1: Crop;
    let crop2: Crop;
    let employee1: Employee;
    let employee2: Employee;

    beforeAll(async () => {
      await harvestRepository.delete({});

      crop1 = (await seedService.CreateCrop({})) as Crop;
      crop2 = (await seedService.CreateCrop({})) as Crop;

      employee1 = (await seedService.CreateEmployee({})) as Employee;
      employee2 = (await seedService.CreateEmployee({})) as Employee;

      const data1: HarvestDto = {
        date: InformationGenerator.generateRandomDate({}),
        crop: { id: crop1.id },
        amount: 100,
        value_pay: 60_000,
        observation: 'No observation',
        details: [
          {
            employee: { id: employee1.id },
            amount: 100,
            value_pay: 60_000,
          } as HarvestDetailsDto,
        ],
      };

      const data2: HarvestDto = {
        date: InformationGenerator.generateRandomDate({ daysToAdd: 5 }),
        crop: { id: crop2.id },
        amount: 150,
        value_pay: 90_000,
        observation: 'No observation',
        details: [
          {
            employee: { id: employee2.id },
            amount: 150,
            value_pay: 90_000,
          } as HarvestDetailsDto,
        ],
      };

      const data3: HarvestDto = {
        date: InformationGenerator.generateRandomDate({ daysToAdd: 10 }),
        crop: { id: crop2.id },
        amount: 300,
        value_pay: 180_000,
        observation: 'No observation',
        details: [
          {
            employee: { id: employee2.id },
            amount: 300,
            value_pay: 180_000,
          } as HarvestDetailsDto,
        ],
      };

      for (let i = 0; i < 6; i++) {
        await Promise.all([
          await harvestController.create(data1),
          await harvestController.create(data2),
          await harvestController.create(data3),
        ]);
      }

      await authService.addPermission(userTest.id, 'find_all_harvests');
    });

    it('should throw an exception for not sending a JWT to the protected path /harvests/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/harvests/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only 10 harvests for default by not sending paging parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/harvests/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });

    it('should return the specified number of harvests passed by the paging arguments by the URL (1)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query({ limit: 11, offset: 0 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(11);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the paging arguments by the URL (2)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query({ limit: 11, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(7);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(2);
      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (includes crop)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query({ crop: crop2.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop.id).toBe(crop2.id);
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (includes crop)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query({ crop: crop1.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop.id).toBe(crop1.id);
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (includes employee)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query({ employees: employee1.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee.id).toBe(employee1.id);
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });

    it('should return the specified number of harvests passed by the query (includes employee)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query({ employees: employee2.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail.employee.id).toBe(employee2.id);
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });

    it('should return the specified number of harvests passed by the query (after date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.AFTER,
        date: InformationGenerator.generateRandomDate({}),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(new Date(harvest.date) > new Date(queryData.date)).toBe(true);
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (before date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.BEFORE,
        date: InformationGenerator.generateRandomDate({ daysToAdd: 1 }),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(new Date(harvest.date) < new Date(queryData.date)).toBe(true);
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (equal date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.EQUAL,
        date: InformationGenerator.generateRandomDate({ daysToAdd: 5 }),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest.date.split('T')[0]).toBe(
          new Date(queryData.date).toISOString().split('T')[0],
        );
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (equal amount)', async () => {
      const queryData = {
        filter_by_amount: true,
        type_filter_amount: TypeFilterNumber.EQUAL,
        amount: 100,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest.amount).toBe(queryData.amount);
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (max amount)', async () => {
      const queryData = {
        filter_by_amount: true,
        type_filter_amount: TypeFilterNumber.MAX,
        amount: 100,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest.amount).toBeGreaterThan(queryData.amount);
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (min amount)', async () => {
      const queryData = {
        filter_by_amount: true,
        type_filter_amount: TypeFilterNumber.MIN,
        amount: 300,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest.amount).toBeLessThan(queryData.amount);
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (equal value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.EQUAL,
        value_pay: 60_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest.value_pay).toBe(queryData.value_pay);
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (max value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.MAX,
        value_pay: 60_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest.value_pay).toBeGreaterThan(queryData.value_pay);
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (min value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.MIN,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest.value_pay).toBeLessThan(queryData.value_pay);
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (value_pay and crop 1)', async () => {
      const queryData = {
        crop: crop1.id,
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.MIN,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('amount');
        expect(harvest).toHaveProperty('value_pay');
        expect(harvest.value_pay).toBeLessThan(queryData.value_pay);
        expect(harvest).toHaveProperty('observation');
        expect(harvest).toHaveProperty('createdDate');
        expect(harvest).toHaveProperty('updatedDate');
        expect(harvest).toHaveProperty('deletedDate');
        expect(harvest.deletedDate).toBeNull();
        expect(harvest).toHaveProperty('crop');
        expect(harvest.crop).toBeDefined();
        expect(harvest.crop).toHaveProperty('id');
        expect(harvest.crop.id).toBe(crop1.id);
        expect(harvest.crop).toHaveProperty('name');
        expect(harvest).toHaveProperty('details');
        expect(harvest.details.length).toBeGreaterThan(0);
        harvest.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('amount');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of harvests passed by the query (value_pay and crop 2)', async () => {
      const queryData = {
        crop: crop2.id,
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.MAX,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(0);
      expect(response.body.current_row_count).toEqual(0);
      expect(response.body.total_page_count).toEqual(0);
      expect(response.body.current_page_count).toEqual(0);
    });

    describe('should return the specified number of harvests passed by the query mix filter', () => {
      beforeAll(async () => {
        const data1: HarvestDto = {
          date: InformationGenerator.generateRandomDate({ daysToAdd: 3 }),
          crop: { id: crop1.id },
          amount: 600,
          value_pay: 360_000,
          observation: 'No observation',
          details: [
            {
              employee: { id: employee1.id },
              amount: 300,
              value_pay: 180_000,
            } as HarvestDetailsDto,
            {
              employee: { id: employee2.id },
              amount: 300,
              value_pay: 180_000,
            } as HarvestDetailsDto,
          ],
        };

        const data2: HarvestDto = {
          date: InformationGenerator.generateRandomDate({ daysToAdd: 3 }),
          crop: { id: crop1.id },
          amount: 500,
          value_pay: 300_000,
          observation: 'No observation',
          details: [
            {
              employee: { id: employee1.id },
              amount: 250,
              value_pay: 150_000,
            } as HarvestDetailsDto,
            {
              employee: { id: employee2.id },
              amount: 250,
              value_pay: 150_000,
            } as HarvestDetailsDto,
          ],
        };

        await Promise.all([
          await harvestController.create(data1),
          await harvestController.create(data2),
        ]);
      });

      it('should return the specified number of harvests passed by the query (MAX value_pay , amount)', async () => {
        const queryData = {
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.MAX,
          value_pay: 200_000,
          filter_by_amount: true,
          type_filter_amount: TypeFilterNumber.MAX,
          amount: 400,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/harvests/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(2);
        expect(response.body.current_row_count).toEqual(2);
        expect(response.body.total_page_count).toEqual(1);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((harvest: Harvest) => {
          expect(harvest).toHaveProperty('id');
          expect(harvest).toHaveProperty('date');
          expect(harvest).toHaveProperty('amount');
          expect(harvest.amount).toBeGreaterThan(queryData.amount);
          expect(harvest).toHaveProperty('value_pay');
          expect(harvest.value_pay).toBeGreaterThan(queryData.value_pay);
          expect(harvest).toHaveProperty('observation');
          expect(harvest).toHaveProperty('createdDate');
          expect(harvest).toHaveProperty('updatedDate');
          expect(harvest).toHaveProperty('deletedDate');
          expect(harvest.deletedDate).toBeNull();
          expect(harvest).toHaveProperty('crop');
          expect(harvest.crop).toBeDefined();
          expect(harvest.crop).toHaveProperty('id');
          expect(harvest.crop.id).toBe(crop1.id);
          expect(harvest.crop).toHaveProperty('name');
          expect(harvest).toHaveProperty('details');
          expect(harvest.details.length).toBeGreaterThan(0);
          harvest.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('payment_is_pending');
            expect(detail).toHaveProperty('employee');
            expect(detail.employee).toBeDefined();
            expect(detail.employee).toHaveProperty('id');
            expect(detail.employee).toHaveProperty('first_name');
            expect(detail.employee).toHaveProperty('last_name');
            expect(detail.employee).toHaveProperty('email');
            expect(detail.employee).toHaveProperty('cell_phone_number');
            expect(detail.employee).toHaveProperty('address');
          });
        });
      });
      it('should return the specified number of harvests passed by the query (MIN 1 value_pay , amount)', async () => {
        const queryData = {
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.MIN,
          value_pay: 400_000,
          filter_by_amount: true,
          type_filter_amount: TypeFilterNumber.MIN,
          amount: 500,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/harvests/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(18);
        expect(response.body.current_row_count).toEqual(10);
        expect(response.body.total_page_count).toEqual(2);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((harvest: Harvest) => {
          expect(harvest).toHaveProperty('id');
          expect(harvest).toHaveProperty('date');
          expect(harvest).toHaveProperty('amount');
          expect(harvest.amount).toBeLessThan(queryData.amount);
          expect(harvest).toHaveProperty('value_pay');
          expect(harvest.value_pay).toBeLessThan(queryData.value_pay);
          expect(harvest).toHaveProperty('observation');
          expect(harvest).toHaveProperty('createdDate');
          expect(harvest).toHaveProperty('updatedDate');
          expect(harvest).toHaveProperty('deletedDate');
          expect(harvest.deletedDate).toBeNull();
          expect(harvest).toHaveProperty('crop');
          expect(harvest.crop).toBeDefined();
          expect(harvest.crop).toHaveProperty('id');

          expect(harvest.crop).toHaveProperty('name');
          expect(harvest).toHaveProperty('details');
          expect(harvest.details.length).toBeGreaterThan(0);
          harvest.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('payment_is_pending');
            expect(detail).toHaveProperty('employee');
            expect(detail.employee).toBeDefined();
            expect(detail.employee).toHaveProperty('id');
            expect(detail.employee).toHaveProperty('first_name');
            expect(detail.employee).toHaveProperty('last_name');
            expect(detail.employee).toHaveProperty('email');
            expect(detail.employee).toHaveProperty('cell_phone_number');
            expect(detail.employee).toHaveProperty('address');
          });
        });
      });
      it('should return the specified number of harvests passed by the query (MIN 2 value_pay , amount)', async () => {
        const queryData = {
          offset: 1,
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.MIN,
          value_pay: 400_000,
          filter_by_amount: true,
          type_filter_amount: TypeFilterNumber.MIN,
          amount: 500,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/harvests/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(18);
        expect(response.body.current_row_count).toEqual(8);
        expect(response.body.total_page_count).toEqual(2);
        expect(response.body.current_page_count).toEqual(2);

        response.body.records.forEach((harvest: Harvest) => {
          expect(harvest).toHaveProperty('id');
          expect(harvest).toHaveProperty('date');
          expect(harvest).toHaveProperty('amount');
          expect(harvest.amount).toBeLessThan(queryData.amount);
          expect(harvest).toHaveProperty('value_pay');
          expect(harvest.value_pay).toBeLessThan(queryData.value_pay);
          expect(harvest).toHaveProperty('observation');
          expect(harvest).toHaveProperty('createdDate');
          expect(harvest).toHaveProperty('updatedDate');
          expect(harvest).toHaveProperty('deletedDate');
          expect(harvest.deletedDate).toBeNull();
          expect(harvest).toHaveProperty('crop');
          expect(harvest.crop).toBeDefined();
          expect(harvest.crop).toHaveProperty('id');

          expect(harvest.crop).toHaveProperty('name');
          expect(harvest).toHaveProperty('details');
          expect(harvest.details.length).toBeGreaterThan(0);
          harvest.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('payment_is_pending');
            expect(detail).toHaveProperty('employee');
            expect(detail.employee).toBeDefined();
            expect(detail.employee).toHaveProperty('id');
            expect(detail.employee).toHaveProperty('first_name');
            expect(detail.employee).toHaveProperty('last_name');
            expect(detail.employee).toHaveProperty('email');
            expect(detail.employee).toHaveProperty('cell_phone_number');
            expect(detail.employee).toHaveProperty('address');
          });
        });
      });
      it('should return the specified number of harvests passed by the query (MIN 3 value_pay , amount)', async () => {
        const queryData = {
          limit: 12,
          offset: 1,
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.MIN,
          value_pay: 400_000,
          filter_by_amount: true,
          type_filter_amount: TypeFilterNumber.MIN,
          amount: 500,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/harvests/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(18);
        expect(response.body.current_row_count).toEqual(6);
        expect(response.body.total_page_count).toEqual(2);
        expect(response.body.current_page_count).toEqual(2);

        response.body.records.forEach((harvest: Harvest) => {
          expect(harvest).toHaveProperty('id');
          expect(harvest).toHaveProperty('date');
          expect(harvest).toHaveProperty('amount');
          expect(harvest.amount).toBeLessThan(queryData.amount);
          expect(harvest).toHaveProperty('value_pay');
          expect(harvest.value_pay).toBeLessThan(queryData.value_pay);
          expect(harvest).toHaveProperty('observation');
          expect(harvest).toHaveProperty('createdDate');
          expect(harvest).toHaveProperty('updatedDate');
          expect(harvest).toHaveProperty('deletedDate');
          expect(harvest.deletedDate).toBeNull();
          expect(harvest).toHaveProperty('crop');
          expect(harvest.crop).toBeDefined();
          expect(harvest.crop).toHaveProperty('id');
          expect(harvest.crop.id).toBe(crop1.id);
          expect(harvest.crop).toHaveProperty('name');
          expect(harvest).toHaveProperty('details');
          expect(harvest.details.length).toBeGreaterThan(0);
          harvest.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('payment_is_pending');
            expect(detail).toHaveProperty('employee');
            expect(detail.employee).toBeDefined();
            expect(detail.employee).toHaveProperty('id');
            expect(detail.employee).toHaveProperty('first_name');
            expect(detail.employee).toHaveProperty('last_name');
            expect(detail.employee).toHaveProperty('email');
            expect(detail.employee).toHaveProperty('cell_phone_number');
            expect(detail.employee).toHaveProperty('address');
          });
        });
      });
      it('should return the specified number of harvests passed by the query (EQUAL 1 date, value_pay , amount)', async () => {
        const queryData = {
          crop: crop2.id,
          filter_by_date: true,
          type_filter_date: TypeFilterDate.EQUAL,
          date: InformationGenerator.generateRandomDate({ daysToAdd: 3 }),
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.EQUAL,
          value_pay: 360_000,
          filter_by_amount: true,
          type_filter_amount: TypeFilterNumber.EQUAL,
          amount: 600,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/harvests/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(0);
        expect(response.body.current_row_count).toEqual(0);
        expect(response.body.total_page_count).toEqual(0);
        expect(response.body.current_page_count).toEqual(0);
      });
      it('should return the specified number of harvests passed by the query (EQUAL 2 date, value_pay , amount)', async () => {
        const queryData = {
          crop: crop1.id,
          filter_by_date: true,
          type_filter_date: TypeFilterDate.EQUAL,
          date: InformationGenerator.generateRandomDate({ daysToAdd: 3 }),
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.EQUAL,
          value_pay: 360_000,
          filter_by_amount: true,
          type_filter_amount: TypeFilterNumber.EQUAL,
          amount: 600,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/harvests/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(1);
        expect(response.body.current_row_count).toEqual(1);
        expect(response.body.total_page_count).toEqual(1);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((harvest: Harvest) => {
          expect(harvest).toHaveProperty('id');
          expect(harvest.crop.id).toBe(crop1.id);
          expect(harvest).toHaveProperty('date');
          expect(harvest.date.split('T')[0]).toBe(
            new Date(queryData.date).toISOString().split('T')[0],
          );
          expect(harvest).toHaveProperty('amount');
          expect(harvest.amount).toBe(queryData.amount);
          expect(harvest).toHaveProperty('value_pay');
          expect(harvest.value_pay).toBe(queryData.value_pay);
          expect(harvest).toHaveProperty('observation');
          expect(harvest).toHaveProperty('createdDate');
          expect(harvest).toHaveProperty('updatedDate');
          expect(harvest).toHaveProperty('deletedDate');
          expect(harvest.deletedDate).toBeNull();
          expect(harvest).toHaveProperty('crop');
          expect(harvest.crop).toBeDefined();
          expect(harvest.crop).toHaveProperty('id');
          expect(harvest.crop.id).toBe(crop1.id);
          expect(harvest.crop).toHaveProperty('name');
          expect(harvest).toHaveProperty('details');
          expect(harvest.details.length).toBeGreaterThan(0);
          harvest.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('amount');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('payment_is_pending');
            expect(detail).toHaveProperty('employee');
            expect(detail.employee).toBeDefined();
            expect(detail.employee).toHaveProperty('id');
            expect(detail.employee).toHaveProperty('first_name');
            expect(detail.employee).toHaveProperty('last_name');
            expect(detail.employee).toHaveProperty('email');
            expect(detail.employee).toHaveProperty('cell_phone_number');
            expect(detail.employee).toHaveProperty('address');
          });
        });
      });
    });

    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/harvests/all')
        .query({ offset: 10 })
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no harvest records with the requested pagination',
      );
    });
  });

  describe('harvests/one/:id (GET)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'find_one_harvest');
    });

    it('should throw an exception for not sending a JWT to the protected path harvests/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/${falseHarvestId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get one harvest', async () => {
      const {
        harvest: { id },
      } = await seedService.CreateHarvest({});

      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const harvest = response.body;
      expect(harvest).toHaveProperty('id');
      expect(harvest).toHaveProperty('date');
      expect(harvest).toHaveProperty('amount');
      expect(harvest).toHaveProperty('value_pay');
      expect(harvest).toHaveProperty('observation');
      expect(harvest).toHaveProperty('createdDate');
      expect(harvest).toHaveProperty('updatedDate');
      expect(harvest).toHaveProperty('deletedDate');
      expect(harvest.deletedDate).toBeNull();
      expect(harvest).toHaveProperty('crop');
      expect(harvest.crop).toBeDefined();
      expect(harvest.crop).toHaveProperty('id');
      expect(harvest.crop).toHaveProperty('name');
      expect(harvest).toHaveProperty('details');
      expect(harvest.details.length).toBeGreaterThan(0);
      harvest.details.forEach((detail) => {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('amount');
        expect(detail).toHaveProperty('value_pay');
        expect(detail).toHaveProperty('payment_is_pending');
        expect(detail).toHaveProperty('employee');
        expect(detail.employee).toBeDefined();
        expect(detail.employee).toHaveProperty('id');
        expect(detail.employee).toHaveProperty('first_name');
        expect(detail.employee).toHaveProperty('last_name');
        expect(detail.employee).toHaveProperty('email');
        expect(detail.employee).toHaveProperty('cell_phone_number');
        expect(detail.employee).toHaveProperty('address');
      });
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/1234`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });

    it('should throw exception for not finding harvest by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/${falseHarvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Harvest with id: ${falseHarvestId} not found`,
      );
    });

    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('harvests/update/one/:id (PUT)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'update_one_harvest');
    });

    it('should throw an exception for not sending a JWT to the protected path harvests/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/${falseHarvestId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should update one harvest', async () => {
      const record = (await seedService.CreateHarvest({})).harvest as Harvest;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const bodyRequest: HarvestDto = {
        ...rest,
        amount: rest.amount + 10 * record.details.length,
        value_pay: rest.value_pay + 2000 * record.details.length,
        crop: { id: rest.crop.id },
        observation: 'Observation updated',
        details: record.details.map((detail) => ({
          id: detail.id,
          employee: { id: detail.employee.id },
          amount: detail.amount + 10,
          value_pay: detail.value_pay + 2000,
        })) as HarvestDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(200);

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('date');
      expect(body).toHaveProperty('amount');
      expect(body.amount).toBe(bodyRequest.amount);
      expect(body).toHaveProperty('value_pay');
      expect(body.value_pay).toBe(bodyRequest.value_pay);
      expect(body).toHaveProperty('observation');
      expect(body.observation).toBe(bodyRequest.observation);
      expect(body).toHaveProperty('createdDate');
      expect(body).toHaveProperty('updatedDate');
      expect(body).toHaveProperty('deletedDate');
      expect(body.deletedDate).toBeNull();
      expect(body).toHaveProperty('crop');
      expect(body.crop).toBeDefined();
      expect(body.crop).toHaveProperty('id');
      expect(body.crop).toHaveProperty('name');
      expect(body).toHaveProperty('details');
      expect(body.details.length).toBeGreaterThan(0);
      body.details.forEach((detail) => {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('amount');
        expect(detail).toHaveProperty('value_pay');
        expect(detail).toHaveProperty('payment_is_pending');
        expect(detail).toHaveProperty('employee');
        expect(detail.employee).toBeDefined();
        expect(detail.employee).toHaveProperty('id');
        expect(detail.employee).toHaveProperty('first_name');
        expect(detail.employee).toHaveProperty('last_name');
        expect(detail.employee).toHaveProperty('email');
        expect(detail.employee).toHaveProperty('cell_phone_number');
        expect(detail.employee).toHaveProperty('address');
      });
    });

    it(' should throw an exception for trying to delete a record that is already paid for.', async () => {
      const record = (await seedService.CreateHarvest({ quantityEmployees: 2 }))
        .harvest as Harvest;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const idHarvestDetail = record.details[0].id;

      await harvestDetailsRepository.update(idHarvestDetail, {
        payment_is_pending: false,
      });

      const bodyRequest: HarvestDto = {
        date: rest.date,
        amount: 100,
        value_pay: 60_000,
        crop: { id: rest.crop.id },
        observation: 'Observation updated',
        details: record.details
          .filter((detail) => detail.id !== idHarvestDetail)
          .map((detail) => ({
            id: detail.id,
            employee: { id: detail.employee.id },
            amount: 100,
            value_pay: 60_000,
          })) as HarvestDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot delete the record with id ${record.details[0].id} , it is linked to a payment record.`,
      );
    });

    it('You should throw an exception for attempting to delete a record that has been cascaded out.', async () => {
      const record = (await seedService.CreateHarvest({ quantityEmployees: 2 }))
        .harvest as Harvest;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const idHarvestDetail = record.details[0].id;

      await harvestDetailsRepository.softDelete(idHarvestDetail);

      const bodyRequest: HarvestDto = {
        date: rest.date,
        amount: 100,
        value_pay: 60_000,
        crop: { id: rest.crop.id },
        observation: 'Observation updated',
        details: record.details
          .filter((detail) => detail.id !== idHarvestDetail)
          .map((detail) => ({
            id: detail.id,
            employee: { id: detail.employee.id },
            amount: 100,
            value_pay: 60_000,
          })) as HarvestDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot delete the record with id ${record.details[0].id} , it is linked to other records.`,
      );
    });

    it(' should throw an exception for trying to modify a record that is already paid for.', async () => {
      const record = (await seedService.CreateHarvest({ quantityEmployees: 3 }))
        .harvest as Harvest;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      await harvestDetailsRepository.update(record.details[0].id, {
        payment_is_pending: false,
      });

      const bodyRequest: HarvestDto = {
        ...rest,
        amount: rest.amount + 10 * record.details.length,
        value_pay: rest.value_pay + 2000 * record.details.length,
        crop: { id: rest.crop.id },
        observation: 'Observation updated',
        details: record.details.map((detail) => ({
          id: detail.id,
          employee: { id: detail.employee.id },
          amount: detail.amount + 10,
          value_pay: detail.value_pay + 2000,
        })) as HarvestDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot update the record with id ${record.details[0].id} , it is linked to a payment record.`,
      );

      await harvestDetailsRepository.update(record.details[0].id, {
        payment_is_pending: true,
      });
    });

    it('You should throw an exception for attempting to modify a record that has been cascaded out.', async () => {
      const harvest = (await seedService.CreateHarvest({})).harvest as Harvest;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = harvest;

      await harvestDetailsRepository.softDelete(harvest.details[0].id);

      const bodyRequest: HarvestDto = {
        ...rest,
        amount: rest.amount + 10 * harvest.details.length,
        value_pay: rest.value_pay + 2000 * harvest.details.length,
        crop: { id: rest.crop.id },
        observation: 'Observation updated',
        details: harvest.details.map((detail) => ({
          id: detail.id,
          employee: { id: detail.employee.id },
          amount: detail.amount + 10,
          value_pay: detail.value_pay + 2000,
        })) as HarvestDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/${harvest.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot update the record with id ${harvest.details[0].id} , it is linked to other records.`,
      );
    });

    it('should throw exception for not finding harvest to update', async () => {
      const bodyRequest: HarvestDto = {
        ...harvestDtoTemplete,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/${falseHarvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(404);
      expect(body.message).toEqual(
        `Harvest with id: ${falseHarvestId} not found`,
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/${falseHarvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
  });

  describe('harvests/remove/one/:id (DELETE)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'remove_one_harvest');
    });

    it('should throw an exception for not sending a JWT to the protected path harvests/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/harvests/remove/one/${falseHarvestId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete one harvest', async () => {
      const { id } = (await seedService.CreateHarvest({})).harvest;

      await request
        .default(app.getHttpServer())
        .delete(`/harvests/remove/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const { notFound } = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(notFound).toBe(true);
    });

    it('You should throw exception for trying to delete a harvest that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/harvests/remove/one/${falseHarvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Harvest with id: ${falseHarvestId} not found`,
      );
    });

    it('should throw an exception when trying to delete a harvest with processed records.', async () => {
      const { harvest, crop } = await seedService.CreateHarvest({});

      await seedService.CreateHarvestProcessed({
        harvestId: harvest.id,
        cropId: crop.id,
        amount: 50,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/harvests/remove/one/${harvest.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(body.message).toEqual(
        `The record with id ${harvest.id} cannot be deleted because it has processed records linked to it.`,
      );
    });

    it('should throw an exception when trying to delete a harvest with payments records', async () => {
      const { employees, harvest } = await seedService.CreateHarvest({
        quantityEmployees: 2,
      });

      await seedService.CreatePayment({
        employeeId: employees[0].id,
        harvestsId: [harvest.details[0].id],
        value_pay: harvest.details[0].value_pay,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/harvests/remove/one/${harvest.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(body.message).toEqual(
        `The record with id ${harvest.id} cannot be deleted because it has payments linked to it.`,
      );
    });
  });

  describe('harvests/remove/bulk (DELETE)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'remove_bulk_harvests');
    });

    it('should throw an exception for not sending a JWT to the protected path harvests/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/harvests/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete harvests bulk', async () => {
      const [
        { harvest: harvest1 },
        { harvest: harvest2 },
        { harvest: harvest3 },
      ] = await Promise.all([
        seedService.CreateHarvest({}),
        seedService.CreateHarvest({}),
        seedService.CreateHarvest({}),
      ]);

      const bulkData: RemoveBulkRecordsDto<Harvest> = {
        recordsIds: [{ id: harvest1.id }, { id: harvest2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/harvests/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(bulkData)
        .expect(200);

      const [deletedHarvest1, deletedHarvest2, remainingHarvest3] =
        await Promise.all([
          harvestRepository.findOne({ where: { id: harvest1.id } }),
          harvestRepository.findOne({ where: { id: harvest2.id } }),
          harvestRepository.findOne({ where: { id: harvest3.id } }),
        ]);

      expect(deletedHarvest1).toBeNull();
      expect(deletedHarvest2).toBeNull();
      expect(remainingHarvest3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/harvests/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });

    it('should throw an exception when trying to delete a harvest with harvest processed.', async () => {
      const [
        { harvest: harvest1 },
        { harvest: harvest2 },
        { harvest: harvest3 },
      ] = await Promise.all([
        seedService.CreateHarvest({}),
        seedService.CreateHarvest({}),
        seedService.CreateHarvest({}),
      ]);

      await Promise.all([
        seedService.CreateHarvestProcessed({
          harvestId: harvest1.id,
          cropId: harvest1.crop.id,
          amount: 50,
        }),
        seedService.CreateHarvestProcessed({
          harvestId: harvest2.id,
          cropId: harvest2.crop.id,
          amount: 50,
        }),
      ]);

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/harvests/remove/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          recordsIds: [
            { id: harvest1.id },
            { id: harvest2.id },
            { id: harvest3.id },
          ],
        })
        .expect(207);
      expect(body).toEqual({
        success: [harvest3.id],
        failed: [
          {
            id: harvest1.id,
            error: `The record with id ${harvest1.id} cannot be deleted because it has processed records linked to it.`,
          },
          {
            id: harvest2.id,
            error: `The record with id ${harvest2.id} cannot be deleted because it has processed records linked to it.`,
          },
        ],
      });
    });

    it('should throw a multi-state code when trying to delete a harvest with payment records and other unrestricted records.', async () => {
      const [
        { harvest: harvest1 },
        { harvest: harvest2 },
        { harvest: harvest3 },
      ] = await Promise.all([
        seedService.CreateHarvest({}),
        seedService.CreateHarvest({}),
        seedService.CreateHarvest({}),
      ]);

      await seedService.CreatePayment({
        harvestsId: [harvest1.details[0].id],
        employeeId: harvest1.details[0].employee.id,
        value_pay: harvest1.details[0].value_pay,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/harvests/remove/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          recordsIds: [
            { id: harvest1.id },
            { id: harvest2.id },
            { id: harvest3.id },
          ],
        })
        .expect(207);
      expect(body).toEqual({
        success: [harvest2.id, harvest3.id],
        failed: [
          {
            id: harvest1.id,
            error: `The record with id ${harvest1.id} cannot be deleted because it has payments linked to it.`,
          },
        ],
      });
    });
  });

  describe('harvests/export/one/pdf/:id (GET)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'export_harvest_to_pdf');
    });

    it('should throw an exception for not sending a JWT to the protected path harvests/export/one/pdf/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/harvests/export/one/pdf/:id')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should export one harvest in PDF format', async () => {
      const record = (await seedService.CreateHarvest({})).harvest;
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/export/one/pdf/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toBeDefined();
      expect(response.headers['content-type']).toEqual('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });

  describe('harvests/processed/create (POST)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'create_harvest_processed');
    });

    it('should throw an exception for not sending a JWT to the protected path /harvests/processed/create', async () => {
      const bodyRequest: HarvestProcessedDto = {
        ...harvestProcessedTemplateDto,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/harvests/processed/create')
        .send(bodyRequest)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should create a new harvest processed', async () => {
      const { harvest } = await seedService.CreateHarvest({});

      const bodyRequest: HarvestProcessedDto = {
        date: InformationGenerator.generateRandomDate({}),
        crop: { id: harvest.crop.id },
        harvest: { id: harvest.id },
        amount: 50,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .post('/harvests/processed/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(201);

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('date');
      expect(body).toHaveProperty('amount');
      expect(body.amount).toBe(bodyRequest.amount);
      expect(body).toHaveProperty('crop');
      expect(body.crop.id).toBe(bodyRequest.crop.id);
      expect(body).toHaveProperty('harvest');
      expect(body.harvest.id).toBe(bodyRequest.harvest.id);
    });

    it('Should throw an exception for attempting to create a processed harvest that exceeds the amount value of the harvest.', async () => {
      const { harvest } = await seedService.CreateHarvest({});

      const bodyRequest: HarvestProcessedDto = {
        date: InformationGenerator.generateRandomDate({}),
        crop: { id: harvest.crop.id },
        harvest: { id: harvest.id },
        amount: harvest.amount + 50,
      } as HarvestProcessedDto;

      const { body } = await request
        .default(app.getHttpServer())
        .post('/harvests/processed/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot add more processed harvest records, it exceeds the value of the harvest with id ${harvest.id}.`,
      );
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'date must be a valid ISO 8601 date string',
        'crop should not be null or undefined',
        'harvest should not be null or undefined',
        'amount must be a positive number',
        'amount must be an integer number',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/harvests/processed/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });
  });

  describe('harvests/processed/update/one/:id (PUT)', () => {
    beforeAll(async () => {
      await authService.addPermission(
        userTest.id,
        'update_one_harvest_processed',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path harvests/processed/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/harvests/processed/update/one/${falseHarvestId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should update one harvest processed', async () => {
      const { harvest } = await seedService.CreateHarvest({});

      const harvestProcessed = await seedService.CreateHarvestProcessed({
        harvestId: harvest.id,
        cropId: harvest.crop.id,
        amount: 50,
      });

      const bodyRequest: HarvestProcessedDto = {
        date: harvestProcessed.date,
        crop: { id: harvest.crop.id },
        harvest: { id: harvest.id },
        amount: harvestProcessed.amount - 5,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/processed/update/one/${harvestProcessed.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(200);

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('date');
      expect(body).toHaveProperty('amount');
      expect(body.amount).toBe(bodyRequest.amount);
      expect(body).toHaveProperty('crop');
      expect(body).toHaveProperty('harvest');
    });

    it('should throw exception for not finding harvest processed to update', async () => {
      const bodyRequest: HarvestProcessedDto = {
        ...harvestProcessedTemplateDto,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/processed/update/one/${falseHarvestId}`)
        .send(bodyRequest)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Harvest processed with id: ${falseHarvestId} not found`,
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/processed/update/one/${falseHarvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
  });

  describe('harvests/processed/remove/one/:id (DELETE)', () => {
    beforeAll(async () => {
      await authService.addPermission(
        userTest.id,
        'remove_one_harvest_processed',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path harvests/processed/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/harvests/processed/remove/one/${falseHarvestId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete one harvest processed', async () => {
      const { harvest } = await seedService.CreateHarvest({});

      const harvestProcessed = await seedService.CreateHarvestProcessed({
        harvestId: harvest.id,
        cropId: harvest.crop.id,
        amount: 50,
      });

      await request
        .default(app.getHttpServer())
        .delete(`/harvests/processed/remove/one/${harvestProcessed.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const record = await harvestProcessedRepository.findOne({
        where: { id: harvestProcessed.id },
      });

      expect(record).toBeNull();
    });

    it('You should throw exception for trying to delete a harvest processed that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/harvests/processed/remove/one/${falseHarvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Harvest processed with id: ${falseHarvestId} not found`,
      );
    });
  });

  describe('should throw an exception because the user JWT does not have permissions for these actions', () => {
    beforeAll(async () => {
      await Promise.all([
        authService.removePermission(userTest.id, 'create_harvest'),
        authService.removePermission(userTest.id, 'find_all_harvests'),
        authService.removePermission(userTest.id, 'find_one_harvest'),
        authService.removePermission(userTest.id, 'update_one_harvest'),
        authService.removePermission(userTest.id, 'remove_one_harvest'),
        authService.removePermission(userTest.id, 'remove_bulk_harvests'),
        authService.removePermission(userTest.id, 'export_harvest_to_pdf'),
        authService.removePermission(userTest.id, 'create_harvest_processed'),
        authService.removePermission(
          userTest.id,
          'update_one_harvest_processed',
        ),
        authService.removePermission(
          userTest.id,
          'remove_one_harvest_processed',
        ),
      ]);
    });

    it('should throw an exception because the user JWT does not have permissions for this action /harvests/create', async () => {
      const bodyRequest: HarvestDto = {
        ...harvestDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/harvests/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /harvests/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/harvests/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/${falseHarvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/${falseHarvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/harvests/remove/one/${falseHarvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/harvests/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/export/one/pdf/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/export/one/pdf/${falseHarvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /harvests/processed/create', async () => {
      const bodyRequest: HarvestProcessedDto = {
        ...harvestProcessedTemplateDto,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/harvests/processed/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/processed/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/harvests/processed/update/one/${falseHarvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/processed/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/harvests/processed/remove/one/${falseHarvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });
});
