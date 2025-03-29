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
import { Repository } from 'typeorm';
import { HarvestDetailsDto } from './dto/create-harvest-details.dto';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { Harvest } from './entities/harvest.entity';
import { HarvestController } from './harvest.controller';
import { HarvestModule } from './harvest.module';
import { HarvestService } from './harvest.service';
import { UpdateHarvestDto } from './dto/update-harvest.dto';

describe('HarvestsController (e2e)', () => {
  let app: INestApplication;
  let harvestRepository: Repository<Harvest>;
  let seedService: SeedService;
  let authService: AuthService;

  let employeeService: EmployeesService;
  let employeeController: EmployeesController;
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
    await app.close();
  });

  describe('harvests/create (POST)', () => {
    it('should throw an exception for not sending a JWT to the protected path /harvests/create', async () => {
      const data: CreateHarvestDto = {
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
        .send(data)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('It should throw an exception because the user JWT does not have permissions for this action /harvests/create', async () => {
      await authService.removePermission(userTest.id, 'create_harvest');

      const data: CreateHarvestDto = {
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

      const data: CreateHarvestDto = {
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
            payment_is_pending: false,
          } as HarvestDetailsDto,
          {
            employee: { id: employee2.id },
            total: 100,
            value_pay: 60_000,
            payment_is_pending: false,
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

    it('Should throw exception when fields are missing in the body', async () => {
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
    let crop1: any;
    let crop2: any;
    let employee1: any;
    let employee2: any;
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

      const data1: CreateHarvestDto = {
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
            payment_is_pending: false,
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

      const data2: CreateHarvestDto = {
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
            payment_is_pending: false,
          } as HarvestDetailsDto,
        ],
      };
      const data3: CreateHarvestDto = {
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
            payment_is_pending: false,
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

    it('It should throw an exception because the user JWT does not have permissions for this action /harvests/all', async () => {
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

    describe('Mix query filter', () => {
      beforeAll(async () => {
        const data1: CreateHarvestDto = {
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
              payment_is_pending: false,
            } as HarvestDetailsDto,
            {
              employee: { id: employee2.id },
              total: 300,
              value_pay: 180_000,
              payment_is_pending: false,
            } as HarvestDetailsDto,
          ],
        };

        const data2: CreateHarvestDto = {
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
              payment_is_pending: false,
            } as HarvestDetailsDto,
            {
              employee: { id: employee2.id },
              total: 250,
              value_pay: 150_000,
              payment_is_pending: false,
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

    it('It should throw an exception because the user JWT does not have permissions for this action harvests/one/:id', async () => {
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

    it('Should get one harvest', async () => {
      // Crear un harvest de prueba
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

    it('Should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/1234`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });

    it('Should throw exception for not finding harvest by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Harvest with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('Should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/harvests/one/`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('harvests/update/one/:id (PATCH)', () => {
    const harvestId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path harvests/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/harvests/update/one/${harvestId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('It should throw an exception because the user JWT does not have permissions for this action harvests/update/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_harvest');
      const response = await request
        .default(app.getHttpServer())
        .patch(`/harvests/update/one/${harvestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('Should update one harvest', async () => {
      await authService.addPermission(userTest.id, 'update_one_harvest');

      const record = (
        await harvestService.findAll({
          limit: 1,
        })
      ).records[0];

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const bodyRequest: UpdateHarvestDto = {
        ...rest,
        crop: { id: rest.crop.id },
        observation: 'Observation updated',
        details: record.details.map((detail) => ({
          id: detail.id,
          employee: { id: detail.employee.id },
          total: detail.total,
          value_pay: detail.value_pay,
        })) as HarvestDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/harvests/update/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(200);

      expect(body.observation).toBe(bodyRequest.observation);

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('date');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('value_pay');
      expect(body).toHaveProperty('observation');
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

    it('Should throw exception for not finding harvest to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/harvests/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ observation: 'Observation updated 2' })
        .expect(404);
      expect(body.message).toEqual(
        'Harvest with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('Should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/harvests/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
  });
});
