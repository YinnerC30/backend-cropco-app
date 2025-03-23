import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { CropsService } from 'src/crops/crops.service';
import { EmployeesService } from 'src/employees/employees.service';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Harvest } from './entities/harvest.entity';
import { HarvestService } from './harvest.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import * as request from 'supertest';
import { HarvestModule } from './harvest.module';
import { HarvestDetailsDto } from './dto/create-harvest-details.dto';
import { CreateCropDto } from 'src/crops/dto/create-crop.dto';
import { CropsController } from 'src/crops/crops.controller';
import { EmployeesController } from 'src/employees/employees.controller';

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

      const employee = await employeeController.create({
        first_name: 'Employee test',
        last_name: 'Employee test',
        email: 'employeetest@mail.com',
        cell_phone_number: '3127836149',
        address: 'no address',
      });

      const data: CreateHarvestDto = {
        date: new Date().toISOString(),
        crop: { id: crop.id },
        total: 100,
        value_pay: 60_000,
        observation: 'No observation',
        details: [
          {
            employee: { id: employee.id },
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
});
