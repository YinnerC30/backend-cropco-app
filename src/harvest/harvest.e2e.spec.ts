import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TestingModule, Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { ClientsModule } from 'src/clients/clients.module';
import { Client } from 'src/clients/entities/client.entity';
import { CommonModule } from 'src/common/common.module';
import { CropsService } from 'src/crops/crops.service';
import { EmployeesService } from 'src/employees/employees.service';
import { SalesModule } from 'src/sales/sales.module';
import { SalesService } from 'src/sales/sales.service';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { HarvestService } from './harvest.service';
import { Harvest } from './entities/harvest.entity';

describe('HarvestsController (e2e)', () => {
  let app: INestApplication;
  let harvestRepository: Repository<Harvest>;
  let seedService: SeedService;
  let authService: AuthService;

  let employeeService: EmployeesService;
  //   let saleService: SalesService;
  let cropService: CropsService;
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
    // saleService = moduleFixture.get<SalesService>(SalesService);
    cropService = moduleFixture.get<CropsService>(CropsService);
    harvestService = moduleFixture.get<HarvestService>(HarvestService);
    employeeService = moduleFixture.get<EmployeesService>(EmployeesService);

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
      getRepositoryToken(Client),
    );

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
});
