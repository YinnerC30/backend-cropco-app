import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { CropsController } from 'src/crops/crops.controller';
import { CropsService } from 'src/crops/crops.service';
import { CreateCropDto } from 'src/crops/dto/create-crop.dto';
import { EmployeesController } from 'src/employees/employees.controller';
import { EmployeesService } from 'src/employees/employees.service';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { IsNull, Not, Repository } from 'typeorm';
import { HarvestDetailsDto } from './dto/harvest-details.dto';
import { HarvestDto } from './dto/harvest.dto';
import { Harvest } from './entities/harvest.entity';
import { HarvestController } from './harvest.controller';
import { HarvestModule } from './harvest.module';
import { HarvestService } from './harvest.service';

import { HarvestProcessed } from './entities/harvest-processed.entity';
import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { HarvestDetails } from './entities/harvest-details.entity';
import { PaymentsController } from 'src/payments/payments.controller';
import { MethodOfPayment } from 'src/payments/entities/payment.entity';
import { PaymentCategoriesDto } from 'src/payments/dto/payment-categories.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { HarvestProcessedDto } from './dto/harvest-processed.dto';

describe('HarvestsController (e2e)', () => {
  let app: INestApplication;
  let harvestRepository: Repository<Harvest>;
  let harvestDetailsRepository: Repository<HarvestDetails>;
  let harvestProcessedRepository: Repository<HarvestProcessed>;
  let seedService: SeedService;
  let authService: AuthService;

  let employeeService: EmployeesService;
  let employeeController: EmployeesController;
  let paymentsController: PaymentsController;
  let cropService: CropsService;
  let cropController: CropsController;
  let harvestService: HarvestService;
  let harvestController: HarvestController;
  let userTest: User;
  let token: string;

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
    cropService = moduleFixture.get<CropsService>(CropsService);
    cropController = moduleFixture.get<CropsController>(CropsController);
    harvestService = moduleFixture.get<HarvestService>(HarvestService);
    harvestController = moduleFixture.get<HarvestController>(HarvestController);
    employeeService = moduleFixture.get<EmployeesService>(EmployeesService);
    employeeController =
      moduleFixture.get<EmployeesController>(EmployeesController);
    paymentsController =
      moduleFixture.get<PaymentsController>(PaymentsController);

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

    harvestRepository = moduleFixture.get<Repository<Harvest>>(
      getRepositoryToken(Harvest),
    );
    harvestDetailsRepository = moduleFixture.get<Repository<HarvestDetails>>(
      getRepositoryToken(HarvestDetails),
    );
    harvestProcessedRepository = moduleFixture.get<
      Repository<HarvestProcessed>
    >(getRepositoryToken(HarvestProcessed));

    await harvestRepository.delete({});
    await cropService.deleteAllCrops();
    await employeeService.deleteAllEmployees();
    userTest = await authService.createUserToTests();
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await harvestRepository.delete({});
    await app.close();
  });

  describe('harvests/create (POST)', () => {
    it('should throw an exception for not sending a JWT to the protected path /harvests/create', async () => {
      const data: HarvestProcessedDto = {
        date: '',
        crop: { id: '' },
        harvest: { id: '' },
        total: 0,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/harvests/create')
        .send(data)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /harvests/create', async () => {
      await authService.removePermission(userTest.id, 'create_harvest');

      const data: HarvestDto = {
        date: '',
        crop: { id: '' },
        total: 0,
        value_pay: 0,
        observation: '',
        details: [],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/harvests/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should create a new harvest', async () => {
      await authService.addPermission(userTest.id, 'create_harvest');

      const crop = await cropController.create({
        name: 'Crop test',
        description: 'No description',
        units: 10,
        location: 'No location',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);

      const employee1 = await employeeController.create({
        first_name: 'Employee test',
        last_name: 'Employee test',
        email: 'employeetest123@mail.com',
        cell_phone_number: '3127836149',
        address: 'no address',
      });
      const employee2 = await employeeController.create({
        first_name: 'Employee test',
        last_name: 'Employee test',
        email: 'employeetest1234@mail.com',
        cell_phone_number: '3127836149',
        address: 'no address',
      });

      const data: HarvestDto = {
        date: new Date().toISOString(),
        crop: { id: crop.id },
        total: 200,
        value_pay: 120_000,
        observation: 'No observation',
        details: [
          {
            employee: { id: employee1.id },
            total: 100,
            value_pay: 60_000,
          } as HarvestDetailsDto,
          {
            employee: { id: employee2.id },
            total: 100,
            value_pay: 60_000,
          } as HarvestDetailsDto,
        ],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/harvests/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(201);
      expect(response.body).toMatchObject(data);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'date must be a valid ISO 8601 date string',
        'crop should not be null or undefined',
        'total must be a positive number',
        'total must be an integer number',
        'value_pay must be a positive number',
        'value_pay must be an integer number',
        'observation must be a string',
        'The array contains duplicate employees. Each employee id must be unique.',
        "The sum of fields [total, value_pay] in 'details' must match the corresponding top-level values.",
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
      crop1 = await cropController.create({
        name: 'Crop test 1',
        description: 'No description',
        units: 10,
        location: 'No location',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);

      employee1 = await employeeController.create({
        first_name: 'Employee test',
        last_name: 'Employee test',
        email: 'employeetest1@mail.com',
        cell_phone_number: '3127836149',
        address: 'no address',
      });

      const data1: HarvestDto = {
        date: new Date().toISOString(),
        crop: { id: crop1.id },
        total: 100,
        value_pay: 60_000,
        observation: 'No observation',
        details: [
          {
            employee: { id: employee1.id },
            total: 100,
            value_pay: 60_000,
          } as HarvestDetailsDto,
        ],
      };
      crop2 = await cropController.create({
        name: 'Crop test 2',
        description: 'No description',
        units: 10,
        location: 'No location',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);

      employee2 = await employeeController.create({
        first_name: 'Employee test',
        last_name: 'Employee test',
        email: 'employeetest2@mail.com',
        cell_phone_number: '3127836149',
        address: 'no address',
      });

      const data2: HarvestDto = {
        date: new Date(
          new Date().setDate(new Date().getDate() + 5),
        ).toISOString(),
        crop: { id: crop2.id },
        total: 150,
        value_pay: 90_000,
        observation: 'No observation',
        details: [
          {
            employee: { id: employee2.id },
            total: 150,
            value_pay: 90_000,
          } as HarvestDetailsDto,
        ],
      };
      const data3: HarvestDto = {
        date: new Date(
          new Date().setDate(new Date().getDate() + 10),
        ).toISOString(),
        crop: { id: crop2.id },
        total: 300,
        value_pay: 180_000,
        observation: 'No observation',
        details: [
          {
            employee: { id: employee2.id },
            total: 300,
            value_pay: 180_000,
          } as HarvestDetailsDto,
        ],
      };

      for (let i = 0; i < 6; i++) {
        await harvestController.create(data1);
        await harvestController.create(data2);
        await harvestController.create(data3);
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /harvests/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/harvests/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /harvests/all', async () => {
      await authService.removePermission(userTest.id, 'find_all_harvests');
      const response = await request
        .default(app.getHttpServer())
        .get('/harvests/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get only 10 harvests for default by not sending paging parameters', async () => {
      await authService.addPermission(userTest.id, 'find_all_harvests');
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

    it('should return the specified number of harvests passed by the paging arguments by the URL', async () => {
      const response1 = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query({ limit: 11, offset: 0 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response1.body.total_row_count).toEqual(18);
      expect(response1.body.current_row_count).toEqual(11);
      expect(response1.body.total_page_count).toEqual(2);
      expect(response1.body.current_page_count).toEqual(1);
      response1.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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

      const response2 = await request
        .default(app.getHttpServer())
        .get(`/harvests/all`)
        .query({ limit: 11, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response2.body.total_row_count).toEqual(18);
      expect(response2.body.current_row_count).toEqual(7);
      expect(response2.body.total_page_count).toEqual(2);
      expect(response2.body.current_page_count).toEqual(2);
      response2.body.records.forEach((harvest: Harvest) => {
        expect(harvest).toHaveProperty('id');
        expect(harvest).toHaveProperty('date');
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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
        date: new Date().toISOString(),
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
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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
        date: new Date(
          new Date().setDate(new Date().getDate() + 1),
        ).toISOString(),
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
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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
        date: new Date(
          new Date().setDate(new Date().getDate() + 5),
        ).toISOString(),
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
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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
    it('should return the specified number of harvests passed by the query (equal total)', async () => {
      const queryData = {
        filter_by_total: true,
        type_filter_total: TypeFilterNumber.EQUAL,
        total: 100,
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
        expect(harvest).toHaveProperty('total');
        expect(harvest.total).toBe(queryData.total);
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
          expect(detail).toHaveProperty('total');
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
    it('should return the specified number of harvests passed by the query (max total)', async () => {
      const queryData = {
        filter_by_total: true,
        type_filter_total: TypeFilterNumber.MAX,
        total: 100,
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
        expect(harvest).toHaveProperty('total');
        expect(harvest.total).toBeGreaterThan(queryData.total);
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
          expect(detail).toHaveProperty('total');
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
    it('should return the specified number of harvests passed by the query (min total)', async () => {
      const queryData = {
        filter_by_total: true,
        type_filter_total: TypeFilterNumber.MIN,
        total: 300,
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
        expect(harvest).toHaveProperty('total');
        expect(harvest.total).toBeLessThan(queryData.total);
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
          expect(detail).toHaveProperty('total');
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
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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
        expect(harvest).toHaveProperty('total');
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
          expect(detail).toHaveProperty('total');
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
          date: new Date(
            new Date().setDate(new Date().getDate() + 3),
          ).toISOString(),
          crop: { id: crop1.id },
          total: 600,
          value_pay: 360_000,
          observation: 'No observation',
          details: [
            {
              employee: { id: employee1.id },
              total: 300,
              value_pay: 180_000,
            } as HarvestDetailsDto,
            {
              employee: { id: employee2.id },
              total: 300,
              value_pay: 180_000,
            } as HarvestDetailsDto,
          ],
        };

        const data2: HarvestDto = {
          date: new Date(
            new Date().setDate(new Date().getDate() + 3),
          ).toISOString(),
          crop: { id: crop1.id },
          total: 500,
          value_pay: 300_000,
          observation: 'No observation',
          details: [
            {
              employee: { id: employee1.id },
              total: 250,
              value_pay: 150_000,
            } as HarvestDetailsDto,
            {
              employee: { id: employee2.id },
              total: 250,
              value_pay: 150_000,
            } as HarvestDetailsDto,
          ],
        };

        const harvest1 = await harvestController.create(data1);
        const harvest2 = await harvestController.create(data2);
      });

      it('should return the specified number of harvests passed by the query (MAX value_pay , total)', async () => {
        const queryData = {
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.MAX,
          value_pay: 200_000,
          filter_by_total: true,
          type_filter_total: TypeFilterNumber.MAX,
          total: 400,
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
          expect(harvest).toHaveProperty('total');
          expect(harvest.total).toBeGreaterThan(queryData.total);
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
            expect(detail).toHaveProperty('total');
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
      it('should return the specified number of harvests passed by the query (MIN 1 value_pay , total)', async () => {
        const queryData = {
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.MIN,
          value_pay: 400_000,
          filter_by_total: true,
          type_filter_total: TypeFilterNumber.MIN,
          total: 500,
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
          expect(harvest).toHaveProperty('total');
          expect(harvest.total).toBeLessThan(queryData.total);
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
            expect(detail).toHaveProperty('total');
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
      it('should return the specified number of harvests passed by the query (MIN 2 value_pay , total)', async () => {
        const queryData = {
          offset: 1,
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.MIN,
          value_pay: 400_000,
          filter_by_total: true,
          type_filter_total: TypeFilterNumber.MIN,
          total: 500,
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
          expect(harvest).toHaveProperty('total');
          expect(harvest.total).toBeLessThan(queryData.total);
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
            expect(detail).toHaveProperty('total');
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
      it('should return the specified number of harvests passed by the query (MIN 3 value_pay , total)', async () => {
        const queryData = {
          limit: 12,
          offset: 1,
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.MIN,
          value_pay: 400_000,
          filter_by_total: true,
          type_filter_total: TypeFilterNumber.MIN,
          total: 500,
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
          expect(harvest).toHaveProperty('total');
          expect(harvest.total).toBeLessThan(queryData.total);
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
            expect(detail).toHaveProperty('total');
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
      it('should return the specified number of harvests passed by the query (EQUAL 1 date, value_pay , total)', async () => {
        const queryData = {
          crop: crop2.id,
          filter_by_date: true,
          type_filter_date: TypeFilterDate.EQUAL,
          date: new Date(
            new Date().setDate(new Date().getDate() + 3),
          ).toISOString(),
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.EQUAL,
          value_pay: 360_000,
          filter_by_total: true,
          type_filter_total: TypeFilterNumber.EQUAL,
          total: 600,
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
      it('should return the specified number of harvests passed by the query (EQUAL 2 date, value_pay , total)', async () => {
        const queryData = {
          crop: crop1.id,
          filter_by_date: true,
          type_filter_date: TypeFilterDate.EQUAL,
          date: new Date(
            new Date().setDate(new Date().getDate() + 3),
          ).toISOString(),
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.EQUAL,
          value_pay: 360_000,
          filter_by_total: true,
          type_filter_total: TypeFilterNumber.EQUAL,
          total: 600,
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
          expect(harvest).toHaveProperty('total');
          expect(harvest.total).toBe(queryData.total);
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
            expect(detail).toHaveProperty('total');
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
    const harvestId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path harvests/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/${harvestId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_harvest');
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/${harvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get one harvest', async () => {
      await authService.addPermission(userTest.id, 'find_one_harvest');

      const record = (
        await harvestService.findAll({
          limit: 1,
        })
      ).records[0];

      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const harvest = response.body;
      expect(harvest).toHaveProperty('id');
      expect(harvest).toHaveProperty('date');
      expect(harvest).toHaveProperty('total');
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
        expect(detail).toHaveProperty('total');
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
        .get(`/harvests/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Harvest with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
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
    const harvestId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path harvests/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/${harvestId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/update/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_harvest');
      const response = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/${harvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should update one harvest', async () => {
      await authService.addPermission(userTest.id, 'update_one_harvest');

      const record = (
        await harvestService.findAll({
          limit: 1,
        })
      ).records[0];

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const bodyRequest: HarvestDto = {
        ...rest,
        total: rest.total + 10 * record.details.length,
        value_pay: rest.value_pay + 2000 * record.details.length,
        crop: { id: rest.crop.id },
        observation: 'Observation updated',
        details: record.details.map((detail) => ({
          id: detail.id,
          employee: { id: detail.employee.id },
          total: detail.total + 10,
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
      expect(body).toHaveProperty('total');
      expect(body.total).toBe(bodyRequest.total);
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
        expect(detail).toHaveProperty('total');
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
      await authService.addPermission(userTest.id, 'update_one_harvest');

      const [employee1, employee2] = (await employeeController.findAll({}))
        .records;
      const crop = (await cropController.findAll({})).records[0];

      const data: HarvestDto = {
        date: new Date().toISOString(),
        crop: { id: crop.id },
        total: 200,
        value_pay: 120_000,
        observation: 'No observation',
        details: [
          {
            employee: { id: employee1.id },
            total: 100,
            value_pay: 60_000,
          } as HarvestDetailsDto,
          {
            employee: { id: employee2.id },
            total: 100,
            value_pay: 60_000,
          } as HarvestDetailsDto,
        ],
      };

      const record = await harvestService.create(data);

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const idHarvestDetail = record.details[0].id;

      await harvestDetailsRepository.update(idHarvestDetail, {
        payment_is_pending: false,
      });

      const bodyRequest: HarvestDto = {
        ...rest,
        total: 100,
        value_pay: 60_000,
        crop: { id: rest.crop.id },
        observation: 'Observation updated',
        details: record.details
          .filter((detail) => detail.id !== idHarvestDetail)
          .map((detail) => ({
            id: detail.id,
            employee: { id: detail.employee.id },
            total: 100,
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
      await authService.addPermission(userTest.id, 'update_one_harvest');

      const [employee1, employee2] = (await employeeController.findAll({}))
        .records;
      const crop = (await cropController.findAll({})).records[0];

      const data: HarvestDto = {
        date: new Date().toISOString(),
        crop: { id: crop.id },
        total: 200,
        value_pay: 120_000,
        observation: 'No observation',
        details: [
          {
            employee: { id: employee1.id },
            total: 100,
            value_pay: 60_000,
          } as HarvestDetailsDto,
          {
            employee: { id: employee2.id },
            total: 100,
            value_pay: 60_000,
          } as HarvestDetailsDto,
        ],
      };

      const record = await harvestService.create(data);

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const idHarvestDetail = record.details[0].id;

      await harvestDetailsRepository.softDelete(idHarvestDetail);

      const bodyRequest: HarvestDto = {
        ...rest,
        total: 100,
        value_pay: 60_000,
        crop: { id: rest.crop.id },
        observation: 'Observation updated',
        details: record.details
          .filter((detail) => detail.id !== idHarvestDetail)
          .map((detail) => ({
            id: detail.id,
            employee: { id: detail.employee.id },
            total: 100,
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
      await authService.addPermission(userTest.id, 'update_one_harvest');

      const record = (
        await harvestService.findAll({
          limit: 1,
        })
      ).records[0];

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      await harvestDetailsRepository.update(record.details[0].id, {
        payment_is_pending: false,
      });

      const bodyRequest: HarvestDto = {
        ...rest,
        total: rest.total + 10 * record.details.length,
        value_pay: rest.value_pay + 2000 * record.details.length,
        crop: { id: rest.crop.id },
        observation: 'Observation updated',
        details: record.details.map((detail) => ({
          id: detail.id,
          employee: { id: detail.employee.id },
          total: detail.total + 10,
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
      await authService.addPermission(userTest.id, 'update_one_harvest');

      const harvest = (
        await harvestService.findAll({
          limit: 1,
        })
      ).records[0];

      const { id, createdDate, updatedDate, deletedDate, ...rest } = harvest;

      await harvestDetailsRepository.softDelete(harvest.details[0].id);

      const bodyRequest: HarvestDto = {
        ...rest,
        total: rest.total + 10 * harvest.details.length,
        value_pay: rest.value_pay + 2000 * harvest.details.length,
        crop: { id: rest.crop.id },
        observation: 'Observation updated',
        details: harvest.details.map((detail) => ({
          id: detail.id,
          employee: { id: detail.employee.id },
          total: detail.total + 10,
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
      const harvest = (
        await harvestService.findAll({
          limit: 1,
        })
      ).records[0];

      const bodyRequest: HarvestDto = {
        date: harvest.date,
        crop: { id: harvest.crop.id },
        total: harvest.total,
        value_pay: harvest.value_pay,
        observation: harvest.observation,
        details: harvest.details.map((h) => ({
          id: h.id,
          employee: { id: h.employee.id },
          total: h.total,
          value_pay: h.value_pay,
        })),
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(404);
      expect(body.message).toEqual(
        'Harvest with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
  });

  describe('harvests/remove/one/:id (DELETE)', () => {
    const harvestId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path harvests/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/harvests/remove/one/${harvestId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/remove/one/:id', async () => {
      await authService.removePermission(userTest.id, 'remove_one_harvest');
      const response = await request
        .default(app.getHttpServer())
        .delete(`/harvests/remove/one/${harvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete one harvest', async () => {
      await authService.addPermission(userTest.id, 'remove_one_harvest');
      const { id } = (
        await harvestService.findAll({
          limit: 1,
        })
      ).records[0];

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
        .delete(`/harvests/remove/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Harvest with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw an exception when trying to delete a harvest with processed records.', async () => {
      const harvest = (
        await harvestService.findAll({
          limit: 1,
        })
      ).records[0];

      await harvestService.createHarvestProcessed({
        date: new Date().toISOString(),
        crop: { id: harvest.crop.id },
        harvest: { id: harvest.id },
        total: 10,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/harvests/remove/one/${harvest.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(body.message).toEqual(
        `The record cannot be deleted because it has processed records linked to it.`,
      );
    });

    it('should throw an exception when trying to delete a harvest with payments records', async () => {
      const harvest = (
        await harvestService.findAll({
          limit: 1,
          offset: 1,
        })
      ).records[0];

      const [employee] = (await employeeController.findAll({})).records;

      await paymentsController.create({
        date: new Date().toISOString(),
        employee: { id: employee.id },
        method_of_payment: MethodOfPayment.EFECTIVO,
        total: harvest.details[0].value_pay,
        categories: {
          harvests: [harvest.details[0].id],
          works: [],
        } as PaymentCategoriesDto,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/harvests/remove/one/${harvest.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(body.message).toEqual(
        `The record cannot be deleted because it has payments linked to it.`,
      );
    });
  });

  describe('harvests/remove/bulk (DELETE)', () => {
    it('should throw an exception for not sending a JWT to the protected path harvests/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/harvests/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/remove/bulk ', async () => {
      await authService.removePermission(userTest.id, 'remove_bulk_harvests');
      const response = await request
        .default(app.getHttpServer())
        .delete('/harvests/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete harvests bulk', async () => {
      await authService.addPermission(userTest.id, 'remove_bulk_harvests');
      const [harvest1, harvest2, harvest3] = (
        await harvestService.findAll({
          limit: 3,
          offset: 1,
        })
      ).records;

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
      const [harvest1, harvest2, harvest3] = await harvestRepository.find({
        relations: { processed: true, crop: true },
        where: {
          processed: {
            id: IsNull(),
          },
        },
        take: 3,
      });

      await harvestService.createHarvestProcessed({
        date: new Date().toISOString(),
        crop: { id: harvest1.crop.id },
        harvest: { id: harvest1.id },
        total: 10,
      });

      await harvestService.createHarvestProcessed({
        date: new Date().toISOString(),
        crop: { id: harvest2.crop.id },
        harvest: { id: harvest2.id },
        total: 10,
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
        success: [harvest3.id],
        failed: [
          {
            id: harvest1.id,
            error:
              'The record cannot be deleted because it has processed records linked to it.',
          },
          {
            id: harvest2.id,
            error:
              'The record cannot be deleted because it has processed records linked to it.',
          },
        ],
      });
    });

    it('should throw a multi-state code when trying to delete a harvest with payment records and other unrestricted records.', async () => {
      const [harvest1, harvest2, harvest3] = await harvestRepository.find({
        relations: {
          processed: true,
          crop: true,
          details: { employee: true },
        },
        where: {
          processed: {
            id: IsNull(),
          },
          details: {
            payments_harvest: {
              id: IsNull(),
            },
          },
        },
        take: 3,
      });

      await paymentsController.create({
        date: new Date().toISOString(),
        employee: { id: harvest1.details[0].employee.id },
        method_of_payment: MethodOfPayment.EFECTIVO,
        total: harvest1.details[0].value_pay,
        categories: {
          harvests: [harvest1.details[0].id],
          works: [],
        } as PaymentCategoriesDto,
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
            error:
              'The record cannot be deleted because it has payments linked to it.',
          },
        ],
      });
    });
  });

  describe('harvests/export/one/pdf/:id (GET)', () => {
    const harvestId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path harvests/export/one/pdf/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/harvests/export/one/pdf/:id')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/export/one/pdf/:id', async () => {
      await authService.removePermission(userTest.id, 'export_harvest_to_pdf');
      const response = await request
        .default(app.getHttpServer())
        .get(`/harvests/export/one/pdf/${harvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should export one harvest in PDF format', async () => {
      await authService.addPermission(userTest.id, 'export_harvest_to_pdf');
      const record = (
        await harvestService.findAll({
          limit: 1,
        })
      ).records[0];
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
    it('should throw an exception for not sending a JWT to the protected path /harvests/processed/create', async () => {
      const data: HarvestProcessedDto = {
        date: '',
        crop: { id: '' },
        harvest: { id: '' },
        total: 0,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/harvests/processed/create')
        .send(data)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /harvests/create', async () => {
      await authService.removePermission(userTest.id, 'create_harvest');

      const data: HarvestProcessedDto = {
        date: '',
        crop: { id: '' },
        harvest: { id: '' },
        total: 0,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/harvests/processed/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should create a new harvest processed', async () => {
      await authService.addPermission(userTest.id, 'create_harvest_processed');

      const harvest = (
        await harvestService.findAll({
          limit: 1,
        })
      ).records[0];

      const data: HarvestProcessedDto = {
        date: new Date().toISOString(),
        crop: { id: harvest.crop.id },
        harvest: { id: harvest.id },
        total: 10,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .post('/harvests/processed/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(201);

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('date');
      expect(body).toHaveProperty('total');
      expect(body.total).toBe(data.total);
      expect(body).toHaveProperty('crop');
      expect(body.crop.id).toBe(data.crop.id);
      expect(body).toHaveProperty('harvest');
      expect(body.harvest.id).toBe(data.harvest.id);
    });

    it('Should throw an exception for attempting to create a processed harvest that exceeds the total value of the harvest.', async () => {
      await authService.addPermission(userTest.id, 'create_harvest_processed');

      const harvest = (
        await harvestService.findAll({
          limit: 1,
        })
      ).records[0];

      const data: HarvestProcessedDto = {
        date: new Date().toISOString(),
        crop: { id: harvest.crop.id },
        harvest: { id: harvest.id },
        total: harvest.total + 50,
      } as HarvestProcessedDto;

      const { body } = await request
        .default(app.getHttpServer())
        .post('/harvests/processed/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(400);

      expect(body.message).toBe(
        'You cannot add more processed harvest records, it exceeds the value of the harvest.',
      );
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'date must be a valid ISO 8601 date string',
        'crop should not be null or undefined',
        'harvest should not be null or undefined',
        'total must be a positive number',
        'total must be an integer number',
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
    const harvestProcessedId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path harvests/processed/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/harvests/processed/update/one/${harvestProcessedId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/processed/update/one/:id', async () => {
      await authService.removePermission(
        userTest.id,
        'update_one_harvest_processed',
      );
      const response = await request
        .default(app.getHttpServer())
        .put(`/harvests/processed/update/one/${harvestProcessedId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should update one harvest processed', async () => {
      await authService.addPermission(
        userTest.id,
        'update_one_harvest_processed',
      );

      const harvest = await harvestRepository.findOne({
        relations: { processed: true, crop: true },
        where: {
          processed: {
            id: Not(IsNull()),
          },
        },
      });

      const harvestProcessed = harvest.processed[0];

      const bodyRequest: HarvestProcessedDto = {
        date: harvestProcessed.date,
        crop: { id: harvest.crop.id },
        harvest: { id: harvest.id },
        total: harvestProcessed.total,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/harvests/processed/update/one/${harvestProcessed.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(200);

      console.log(body);

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('date');
      expect(body).toHaveProperty('total');
      expect(body.total).toBe(bodyRequest.total);
      expect(body).toHaveProperty('crop');
      expect(body).toHaveProperty('harvest');
    });

    it('should throw exception for not finding harvest processed to update', async () => {
      const harvest = await harvestRepository.findOne({
        relations: { processed: true, crop: true },
        where: {
          processed: {
            id: Not(IsNull()),
          },
        },
      });

      const harvestProcessed = harvest.processed[0];

      const bodyRequest: HarvestProcessedDto = {
        date: harvestProcessed.date,
        crop: { id: harvest.crop.id },
        harvest: { id: harvest.id },
        total: harvestProcessed.total,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(
          `/harvests/processed/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`,
        )
        .send(bodyRequest)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Harvest processed with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .put(
          `/harvests/processed/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
  });

  describe('harvests/processed/remove/one/:id (DELETE)', () => {
    const harvestProcessedId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path harvests/processed/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/harvests/processed/remove/one/${harvestProcessedId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action harvests/processed/remove/one/:id', async () => {
      await authService.removePermission(userTest.id, 'remove_one_harvest');
      const response = await request
        .default(app.getHttpServer())
        .delete(`/harvests/processed/remove/one/${harvestProcessedId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete one harvest processed', async () => {
      await authService.addPermission(
        userTest.id,
        'remove_one_harvest_processed',
      );

      const harvests = await harvestRepository.find({
        relations: { processed: true, crop: true },
        where: {
          processed: {
            id: Not(IsNull()),
          },
        },
      });

      const { processed } = harvests[0];

      await request
        .default(app.getHttpServer())
        .delete(`/harvests/processed/remove/one/${processed[0].id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const record = await harvestProcessedRepository.findOne({
        where: { id: processed[0].id },
      });

      expect(record).toBeNull();
    });

    it('You should throw exception for trying to delete a harvest processed that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(
          `/harvests/processed/remove/one/2f6b49e7-5114-463b-8e7c-748633a9e157`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Harvest processed with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });
  });
});
