import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { CropsController } from 'src/crops/crops.controller';
import { CropsService } from 'src/crops/crops.service';
import { CreateCropDto } from 'src/crops/dto/create-crop.dto';
import { EmployeesController } from 'src/employees/employees.controller';
import { EmployeesService } from 'src/employees/employees.service';
import { SeedModule } from 'src/seed/seed.module';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { IsNull, Repository } from 'typeorm';
import { WorkDetailsDto } from './dto/create-work-details.dto';
import { CreateWorkDto } from './dto/create-work.dto';
import { Work } from './entities/work.entity';
import { WorkController } from './work.controller';
import { WorkModule } from './work.module';
import { WorkService } from './work.service';

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { PaymentCategoriesDto } from 'src/payments/dto/payment-categories.dto';
import { MethodOfPayment } from 'src/payments/entities/payment.entity';
import { PaymentsController } from 'src/payments/payments.controller';
import { UpdateWorkDto } from './dto/update-work.dto';
import { WorkDetails } from './entities/work-details.entity';

describe('WorksController (e2e)', () => {
  let app: INestApplication;
  let workRepository: Repository<Work>;
  let workDetailsRepository: Repository<WorkDetails>;
  let authService: AuthService;

  let employeeService: EmployeesService;
  let employeeController: EmployeesController;
  let paymentsController: PaymentsController;
  let cropService: CropsService;
  let cropController: CropsController;
  let workService: WorkService;
  let workController: WorkController;
  let userTest: User;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
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

    authService = moduleFixture.get<AuthService>(AuthService);
    cropService = moduleFixture.get<CropsService>(CropsService);
    cropController = moduleFixture.get<CropsController>(CropsController);
    workService = moduleFixture.get<WorkService>(WorkService);
    workController = moduleFixture.get<WorkController>(WorkController);
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

    workRepository = moduleFixture.get<Repository<Work>>(
      getRepositoryToken(Work),
    );
    workDetailsRepository = moduleFixture.get<Repository<WorkDetails>>(
      getRepositoryToken(WorkDetails),
    );

    await workRepository.delete({});
    await cropService.deleteAllCrops();
    await employeeService.deleteAllEmployees();
    userTest = await authService.createUserToTests();
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await workRepository.delete({});
    await app.close();
  });

  describe('works/create (POST)', () => {
    it('should throw an exception for not sending a JWT to the protected path /works/create', async () => {
      const data: CreateWorkDto = {
        date: '',
        description: '',
        value_pay: 0,
        crop: { id: '' },
        details: [],
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/works/create')
        .send(data)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /works/create', async () => {
      await authService.removePermission(userTest.id, 'create_work');

      const data: CreateWorkDto = {
        date: '',
        description: '',
        value_pay: 0,
        crop: { id: '' },
        details: [],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/works/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should create a new work', async () => {
      await authService.addPermission(userTest.id, 'create_work');

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

      const data: CreateWorkDto = {
        date: new Date().toISOString(),
        crop: { id: crop.id },
        value_pay: 120_000,
        description: 'No description',
        details: [
          {
            employee: { id: employee1.id },
            value_pay: 60_000,
          } as WorkDetailsDto,
          {
            employee: { id: employee2.id },
            value_pay: 60_000,
          } as WorkDetailsDto,
        ],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/works/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(201);
      expect(response.body).toMatchObject(data);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'date must be a valid ISO 8601 date string',
        'description must be longer than or equal to 10 characters',
        'description must be a string',
        'value_pay must be a positive number',
        'value_pay must be an integer number',
        'details should not be empty',
        'details must be an array',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/works/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });
  });

  describe('works/all (GET)', () => {
    let crop1: Crop;
    let crop2: Crop;
    let employee1: Employee;
    let employee2: Employee;
    beforeAll(async () => {
      await workRepository.delete({});
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

      const data1: CreateWorkDto = {
        date: new Date().toISOString(),
        crop: { id: crop1.id },
        value_pay: 60_000,
        description: 'No description',
        details: [
          {
            employee: { id: employee1.id },
            value_pay: 60_000,
          } as WorkDetailsDto,
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

      const data2: CreateWorkDto = {
        date: new Date(
          new Date().setDate(new Date().getDate() + 5),
        ).toISOString(),
        crop: { id: crop2.id },
        value_pay: 90_000,
        description: 'No description',
        details: [
          {
            employee: { id: employee2.id },
            value_pay: 90_000,
          } as WorkDetailsDto,
        ],
      };
      const data3: CreateWorkDto = {
        date: new Date(
          new Date().setDate(new Date().getDate() + 10),
        ).toISOString(),
        crop: { id: crop2.id },
        value_pay: 180_000,
        description: 'No description',
        details: [
          {
            employee: { id: employee2.id },
            value_pay: 180_000,
          } as WorkDetailsDto,
        ],
      };

      for (let i = 0; i < 6; i++) {
        await workController.create(data1);
        await workController.create(data2);
        await workController.create(data3);
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /works/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/works/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /works/all', async () => {
      await authService.removePermission(userTest.id, 'find_all_works');
      const response = await request
        .default(app.getHttpServer())
        .get('/works/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get only 10 works for default by not sending paging parameters', async () => {
      await authService.addPermission(userTest.id, 'find_all_works');
      const response = await request
        .default(app.getHttpServer())
        .get('/works/all')
        .set('Authorization', `Bearer ${token}`)

        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });

    it('should return the specified number of works passed by the paging arguments by the URL', async () => {
      const response1 = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query({ limit: 11, offset: 0 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response1.body.total_row_count).toEqual(18);
      expect(response1.body.current_row_count).toEqual(11);
      expect(response1.body.total_page_count).toEqual(2);
      expect(response1.body.current_page_count).toEqual(1);
      response1.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
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
        .get(`/works/all`)
        .query({ limit: 11, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response2.body.total_row_count).toEqual(18);
      expect(response2.body.current_row_count).toEqual(7);
      expect(response2.body.total_page_count).toEqual(2);
      expect(response2.body.current_page_count).toEqual(2);
      response2.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
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
    it('should return the specified number of works passed by the query (includes crop)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query({ crop: crop2.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop.id).toBe(crop2.id);
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
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
    it('should return the specified number of works passed by the query (includes crop)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query({ crop: crop1.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop.id).toBe(crop1.id);
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
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
    it('should return the specified number of works passed by the query (includes employee)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query({ employees: employee1.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
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

    it('should return the specified number of works passed by the query (includes employee)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query({ employees: employee2.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail.employee.id).toBe(employee2.id);
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

    it('should return the specified number of works passed by the query (after date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.AFTER,
        date: new Date().toISOString(),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(new Date(work.date) > new Date(queryData.date)).toBe(true);
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
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
    it('should return the specified number of works passed by the query (before date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.BEFORE,
        date: new Date(
          new Date().setDate(new Date().getDate() + 1),
        ).toISOString(),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(new Date(work.date) < new Date(queryData.date)).toBe(true);
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
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
    it('should return the specified number of works passed by the query (equal date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.EQUAL,
        date: new Date(
          new Date().setDate(new Date().getDate() + 5),
        ).toISOString(),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work.date.split('T')[0]).toBe(
          new Date(queryData.date).toISOString().split('T')[0],
        );
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
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

    it('should return the specified number of works passed by the query (equal value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.EQUAL,
        value_pay: 60_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work.value_pay).toBe(queryData.value_pay);
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
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
    it('should return the specified number of works passed by the query (max value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.MAX,
        value_pay: 60_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work.value_pay).toBeGreaterThan(queryData.value_pay);
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
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
    it('should return the specified number of works passed by the query (min value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.MIN,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work.value_pay).toBeLessThan(queryData.value_pay);
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
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

    it('should return the specified number of works passed by the query (value_pay and crop 1)', async () => {
      const queryData = {
        crop: crop1.id,
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.MIN,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work.value_pay).toBeLessThan(queryData.value_pay);
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop.id).toBe(crop1.id);
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
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
    it('should return the specified number of works passed by the query (value_pay and crop 2)', async () => {
      const queryData = {
        crop: crop2.id,
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.MAX,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(0);
      expect(response.body.current_row_count).toEqual(0);
      expect(response.body.total_page_count).toEqual(0);
      expect(response.body.current_page_count).toEqual(0);
    });

    describe('should return the specified number of works passed by the query mix filter', () => {
      beforeAll(async () => {
        const data1: CreateWorkDto = {
          date: new Date(
            new Date().setDate(new Date().getDate() + 3),
          ).toISOString(),
          crop: { id: crop1.id },
          value_pay: 360_000,
          description: 'No description',
          details: [
            {
              employee: { id: employee1.id },
              value_pay: 180_000,
            } as WorkDetailsDto,
            {
              employee: { id: employee2.id },
              value_pay: 180_000,
            } as WorkDetailsDto,
          ],
        };

        const data2: CreateWorkDto = {
          date: new Date(
            new Date().setDate(new Date().getDate() + 3),
          ).toISOString(),
          crop: { id: crop1.id },
          value_pay: 300_000,
          description: 'No description',
          details: [
            {
              employee: { id: employee1.id },
              value_pay: 150_000,
            } as WorkDetailsDto,
            {
              employee: { id: employee2.id },
              value_pay: 150_000,
            } as WorkDetailsDto,
          ],
        };

        const work1 = await workController.create(data1);
        const work2 = await workController.create(data2);
      });

      it('should return the specified number of works passed by the query (EQUAL 1 date , value_pay)', async () => {
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
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/works/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(0);
        expect(response.body.current_row_count).toEqual(0);
        expect(response.body.total_page_count).toEqual(0);
        expect(response.body.current_page_count).toEqual(0);
      });
      it('should return the specified number of works passed by the query (EQUAL 2 date, value_pay)', async () => {
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
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/works/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(1);
        expect(response.body.current_row_count).toEqual(1);
        expect(response.body.total_page_count).toEqual(1);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((work: Work) => {
          expect(work).toHaveProperty('id');
          expect(work.crop.id).toBe(crop1.id);
          expect(work).toHaveProperty('date');
          expect(work.date.split('T')[0]).toBe(
            new Date(queryData.date).toISOString().split('T')[0],
          );
          expect(work).toHaveProperty('value_pay');
          expect(work.value_pay).toBe(queryData.value_pay);
          expect(work.value_pay).toBe(queryData.value_pay);
          expect(work).toHaveProperty('description');
          expect(work).toHaveProperty('createdDate');
          expect(work).toHaveProperty('updatedDate');
          expect(work).toHaveProperty('deletedDate');
          expect(work.deletedDate).toBeNull();
          expect(work).toHaveProperty('crop');
          expect(work.crop).toBeDefined();
          expect(work.crop).toHaveProperty('id');
          expect(work.crop.id).toBe(crop1.id);
          expect(work.crop).toHaveProperty('name');
          expect(work).toHaveProperty('details');
          expect(work.details.length).toBeGreaterThan(0);
          work.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
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
        .get('/works/all')
        .query({ offset: 10 })
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no work records with the requested pagination',
      );
    });
  });

  describe('works/one/:id (GET)', () => {
    const workId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path works/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/one/${workId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action works/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_work');
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/one/${workId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get one work', async () => {
      await authService.addPermission(userTest.id, 'find_one_work');

      const record = (
        await workService.findAll({
          limit: 1,
        })
      ).records[0];

      const response = await request
        .default(app.getHttpServer())
        .get(`/works/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const work = response.body;
      expect(work).toHaveProperty('id');
      expect(work).toHaveProperty('date');
      expect(work).toHaveProperty('value_pay');
      expect(work).toHaveProperty('description');
      expect(work).toHaveProperty('createdDate');
      expect(work).toHaveProperty('updatedDate');
      expect(work).toHaveProperty('deletedDate');
      expect(work.deletedDate).toBeNull();
      expect(work).toHaveProperty('crop');
      expect(work.crop).toBeDefined();
      expect(work.crop).toHaveProperty('id');
      expect(work.crop).toHaveProperty('name');
      expect(work).toHaveProperty('details');
      expect(work.details.length).toBeGreaterThan(0);
      work.details.forEach((detail) => {
        expect(detail).toHaveProperty('id');
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
        .get(`/works/one/1234`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });

    it('should throw exception for not finding work by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/works/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Work with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/works/one/`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('works/update/one/:id (PATCH)', () => {
    const workId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path works/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/works/update/one/${workId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action works/update/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_work');
      const response = await request
        .default(app.getHttpServer())
        .patch(`/works/update/one/${workId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should update one work', async () => {
      await authService.addPermission(userTest.id, 'update_one_work');

      const record = (
        await workService.findAll({
          limit: 1,
        })
      ).records[0];

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const bodyRequest: UpdateWorkDto = {
        ...rest,
        value_pay: rest.value_pay + 2000 * record.details.length,
        crop: { id: rest.crop.id },
        description: 'Observation updated',
        details: record.details.map((detail) => ({
          id: detail.id,
          employee: { id: detail.employee.id },
          value_pay: detail.value_pay + 2000,
        })) as WorkDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/works/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(200);

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('date');
      expect(body).toHaveProperty('value_pay');
      expect(body.value_pay).toBe(bodyRequest.value_pay);
      expect(body).toHaveProperty('description');
      expect(body.description).toBe(bodyRequest.description);
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
      await authService.addPermission(userTest.id, 'update_one_work');

      const [employee1, employee2] = (await employeeController.findAll({}))
        .records;
      const crop = (await cropController.findAll({})).records[0];

      const data: CreateWorkDto = {
        date: new Date().toISOString(),
        crop: { id: crop.id },
        value_pay: 120_000,
        description: 'No description',
        details: [
          {
            employee: { id: employee1.id },
            value_pay: 60_000,
          } as WorkDetailsDto,
          {
            employee: { id: employee2.id },
            value_pay: 60_000,
          } as WorkDetailsDto,
        ],
      };

      const record = await workService.create(data);

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const idWorkDetail = record.details[0].id;

      await workDetailsRepository.update(idWorkDetail, {
        payment_is_pending: false,
      });

      const bodyRequest: UpdateWorkDto = {
        ...rest,
        value_pay: 60_000,
        crop: { id: rest.crop.id },
        description: 'Observation updated',
        details: record.details
          .filter((detail) => detail.id !== idWorkDetail)
          .map((detail) => ({
            id: detail.id,
            employee: { id: detail.employee.id },
            value_pay: 60_000,
          })) as WorkDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/works/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot delete the record with id ${record.details[0].id} , it is linked to a payment record.`,
      );
    });

    it('You should throw an exception for attempting to delete a record that has been cascaded out.', async () => {
      await authService.addPermission(userTest.id, 'update_one_work');

      const [employee1, employee2] = (await employeeController.findAll({}))
        .records;
      const crop = (await cropController.findAll({})).records[0];

      const data: CreateWorkDto = {
        date: new Date().toISOString(),
        crop: { id: crop.id },
        value_pay: 120_000,
        description: 'No description',
        details: [
          {
            employee: { id: employee1.id },
            value_pay: 60_000,
          } as WorkDetailsDto,
          {
            employee: { id: employee2.id },
            value_pay: 60_000,
          } as WorkDetailsDto,
        ],
      };

      const record = await workService.create(data);

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const idWorkDetail = record.details[0].id;

      await workDetailsRepository.softDelete(idWorkDetail);

      const bodyRequest: UpdateWorkDto = {
        ...rest,
        value_pay: 60_000,
        crop: { id: rest.crop.id },
        description: 'Observation updated',
        details: record.details
          .filter((detail) => detail.id !== idWorkDetail)
          .map((detail) => ({
            id: detail.id,
            employee: { id: detail.employee.id },
            value_pay: 60_000,
          })) as WorkDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/works/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot delete the record with id ${record.details[0].id} , it is linked to other records.`,
      );
    });

    it(' should throw an exception for trying to modify a record that is already paid for.', async () => {
      await authService.addPermission(userTest.id, 'update_one_work');

      const record = (
        await workService.findAll({
          limit: 1,
        })
      ).records[0];

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      await workDetailsRepository.update(record.details[0].id, {
        payment_is_pending: false,
      });

      const bodyRequest: UpdateWorkDto = {
        ...rest,
        value_pay: rest.value_pay + 2000 * record.details.length,
        crop: { id: rest.crop.id },
        description: 'Observation updated',
        details: record.details.map((detail) => ({
          id: detail.id,
          employee: { id: detail.employee.id },
          value_pay: detail.value_pay + 2000,
        })) as WorkDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/works/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot update the record with id ${record.details[0].id} , it is linked to a payment record.`,
      );

      await workDetailsRepository.update(record.details[0].id, {
        payment_is_pending: true,
      });
    });

    it('You should throw an exception for attempting to modify a record that has been cascaded out.', async () => {
      await authService.addPermission(userTest.id, 'update_one_work');

      const record = (
        await workService.findAll({
          limit: 1,
        })
      ).records[0];

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      await workDetailsRepository.softDelete(record.details[0].id);

      const bodyRequest: UpdateWorkDto = {
        ...rest,
        value_pay: rest.value_pay + 2000 * record.details.length,
        crop: { id: rest.crop.id },
        description: 'Observation updated',
        details: record.details.map((detail) => ({
          id: detail.id,
          employee: { id: detail.employee.id },
          value_pay: detail.value_pay + 2000,
        })) as WorkDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/works/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot update the record with id ${record.details[0].id} , it is linked to other records.`,
      );
    });

    it('should throw exception for not finding work to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/works/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Observation updated 2' })
        .expect(404);
      expect(body.message).toEqual(
        'Work with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/works/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
  });

  describe('works/remove/one/:id (DELETE)', () => {
    const workId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path works/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/works/remove/one/${workId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action works/remove/one/:id', async () => {
      await authService.removePermission(userTest.id, 'remove_one_work');
      const response = await request
        .default(app.getHttpServer())
        .delete(`/works/remove/one/${workId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete one work', async () => {
      await authService.addPermission(userTest.id, 'remove_one_work');
      const { id } = (
        await workService.findAll({
          limit: 1,
        })
      ).records[0];

      await request
        .default(app.getHttpServer())
        .delete(`/works/remove/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const { notFound } = await request
        .default(app.getHttpServer())
        .get(`/works/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(notFound).toBe(true);
    });

    it('You should throw exception for trying to delete a work that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/works/remove/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Work with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw an exception when trying to delete a work with payments records', async () => {
      const work = (
        await workService.findAll({
          limit: 1,
          offset: 1,
        })
      ).records[0];

      const [employee] = (await employeeController.findAll({})).records;

      await paymentsController.create({
        date: new Date().toISOString(),
        employee: { id: employee.id },
        method_of_payment: MethodOfPayment.EFECTIVO,
        total: work.details[0].value_pay,
        categories: {
          works: [work.details[0].id],
          harvests: [],
        } as PaymentCategoriesDto,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/works/remove/one/${work.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(body.message).toEqual(
        `The record cannot be deleted because it has payments linked to it.`,
      );
    });
  });

  describe('works/remove/bulk (DELETE)', () => {
    it('should throw an exception for not sending a JWT to the protected path works/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/works/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action works/remove/bulk ', async () => {
      await authService.removePermission(userTest.id, 'remove_bulk_works');
      const response = await request
        .default(app.getHttpServer())
        .delete('/works/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete works bulk', async () => {
      await authService.addPermission(userTest.id, 'remove_bulk_works');
      const [work1, work2, work3] = (
        await workService.findAll({
          limit: 3,
          offset: 1,
        })
      ).records;

      const bulkData: RemoveBulkRecordsDto<Work> = {
        recordsIds: [{ id: work1.id }, { id: work2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/works/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(bulkData)
        .expect(200);

      const [deletedWork1, deletedWork2, remainingWork3] = await Promise.all([
        workRepository.findOne({ where: { id: work1.id } }),
        workRepository.findOne({ where: { id: work2.id } }),
        workRepository.findOne({ where: { id: work3.id } }),
      ]);

      expect(deletedWork1).toBeNull();
      expect(deletedWork2).toBeNull();
      expect(remainingWork3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/works/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });

    it('should throw a multi-state code when trying to delete a work with payment records and other unrestricted records.', async () => {
      const [work1, work2, work3] = await workRepository.find({
        relations: {
          crop: true,
          details: { employee: true },
        },
        where: {
          details: {
            payments_work: {
              id: IsNull(),
            },
          },
        },
        take: 3,
      });

      await paymentsController.create({
        date: new Date().toISOString(),
        employee: { id: work1.details[0].employee.id },
        method_of_payment: MethodOfPayment.EFECTIVO,
        total: work1.details[0].value_pay,
        categories: {
          works: [work1.details[0].id],
          harvests: [],
        } as PaymentCategoriesDto,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/works/remove/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          recordsIds: [{ id: work1.id }, { id: work2.id }, { id: work3.id }],
        })
        .expect(207);
      expect(body).toEqual({
        success: [work2.id, work3.id],
        failed: [
          {
            id: work1.id,
            error:
              'The record cannot be deleted because it has payments linked to it.',
          },
        ],
      });
    });
  });

  describe('works/export/one/pdf/:id (GET)', () => {
    const workId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path works/export/one/pdf/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/works/export/one/pdf/:id')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action works/export/one/pdf/:id', async () => {
      await authService.removePermission(userTest.id, 'export_work_to_pdf');
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/export/one/pdf/${workId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should export one work in PDF format', async () => {
      await authService.addPermission(userTest.id, 'export_work_to_pdf');
      const record = (
        await workService.findAll({
          limit: 1,
        })
      ).records[0];
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/export/one/pdf/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toBeDefined();
      expect(response.headers['content-type']).toEqual('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });
});
