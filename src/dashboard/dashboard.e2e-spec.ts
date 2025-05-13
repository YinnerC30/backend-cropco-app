import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import { DashboardModule } from './dashboard.module';
import * as request from 'supertest';
import { Employee } from 'src/employees/entities/employee.entity';
import { Repository } from 'typeorm';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { Client } from 'src/clients/entities/client.entity';
import { Crop } from 'src/crops/entities/crop.entity';
import { Harvest } from 'src/harvest/entities/harvest.entity';
import { Work } from 'src/work/entities/work.entity';
import { Sale } from 'src/sales/entities/sale.entity';
import { SuppliesConsumption } from 'src/consumptions/entities/supplies-consumption.entity';

describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  let seedService: SeedService;
  let authService: AuthService;

  let userTest: User;
  let token: string;

  let employeesRepository: Repository<Employee>;
  let clientsRepository: Repository<Client>;
  let cropsRepository: Repository<Crop>;
  let harvestsRepository: Repository<Harvest>;
  let worksRepository: Repository<Work>;
  let salesRepository: Repository<Sale>;
  let consumptionsRepository: Repository<SuppliesConsumption>;

  let dateWithCurrentYear: string;
  let dateWithPastYear: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
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
        DashboardModule,
      ],
    }).compile();

    seedService = moduleFixture.get<SeedService>(SeedService);
    authService = moduleFixture.get<AuthService>(AuthService);
    employeesRepository = moduleFixture.get<Repository<Employee>>(
      getRepositoryToken(Employee),
    );
    clientsRepository = moduleFixture.get<Repository<Client>>(
      getRepositoryToken(Client),
    );
    cropsRepository = moduleFixture.get<Repository<Crop>>(
      getRepositoryToken(Crop),
    );
    harvestsRepository = moduleFixture.get<Repository<Harvest>>(
      getRepositoryToken(Harvest),
    );
    worksRepository = moduleFixture.get<Repository<Work>>(
      getRepositoryToken(Work),
    );
    salesRepository = moduleFixture.get<Repository<Sale>>(
      getRepositoryToken(Sale),
    );
    consumptionsRepository = moduleFixture.get<Repository<SuppliesConsumption>>(
      getRepositoryToken(SuppliesConsumption),
    );

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

    userTest = (await seedService.CreateUser({})) as User;
    token = authService.generateJwtToken({
      id: userTest.id,
    });

    await employeesRepository.delete({});
    await clientsRepository.delete({});
    await cropsRepository.delete({});
    await harvestsRepository.delete({});
    await worksRepository.delete({});

    dateWithCurrentYear = InformationGenerator.generateRandomDate({});
    dateWithPastYear = InformationGenerator.generateRandomDate({
      yearsToAdd: -1,
    });
  }, 10_000);

  describe('dashboard/find/top-employees-in-harvests (GET)', () => {
    let employees: Employee[];

    beforeAll(async () => {
      const result = await seedService.CreateHarvest({
        quantityEmployees: 5,
        date: dateWithPastYear,
      });

      employees = [...result.employees];

      for (const employeeId of [employees[0].id, employees[1].id]) {
        await Promise.all([
          seedService.CreateHarvestAdvanced({
            employeeId,
            date: dateWithCurrentYear,
          }),
          seedService.CreateHarvestAdvanced({
            employeeId,
            date: dateWithCurrentYear,
          }),
        ]);
      }

      await authService.addPermission(
        userTest.id,
        'find_top_employees_in_harvests_chart',
      );
    });

    it('should return the top 5 employees with the most harvests', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-harvests')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(body.total_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeLessThan(6);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record, index) => {
        if (index === 0 || index === 1) {
          expect(record.total_harvests).toBe(300);
          expect(record.total_value_pay).toBe(180000);
        } else {
          expect(record.total_harvests).toBe(150);
          expect(record.total_value_pay).toBe(90_000);
        }

        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_harvests');
        expect(record).toHaveProperty('total_value_pay');
      });
    });

    it('should return the top 5 employees in current year', async () => {
      const queryData = {
        year: new Date(dateWithCurrentYear).getFullYear(),
      };

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-harvests')
        .set('Authorization', `Bearer ${token}`)
        .query(queryData)
        .expect(200);

      expect(body.total_row_count).toBe(2);
      expect(body.current_row_count).toBe(2);
      expect(body.current_row_count).toBeLessThan(6);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record, index) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_harvests');
        expect(record).toHaveProperty('total_value_pay');
        expect(record.total_harvests).toBe(300);
        expect(record.total_value_pay).toBe(180_000);
      });
    });

    it('should return the top 5 employees in past year', async () => {
      const queryData = {
        year: new Date(dateWithPastYear).getFullYear(),
      };

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-harvests')
        .set('Authorization', `Bearer ${token}`)
        .query(queryData)
        .expect(200);

      expect(body.total_row_count).toBe(5);
      expect(body.current_row_count).toBe(5);
      expect(body.current_row_count).toBeLessThan(6);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_harvests');
        expect(record).toHaveProperty('total_value_pay');
        expect(record.total_harvests).toBe(150);
        expect(record.total_value_pay).toBe(90_000);
      });
    });
  });

  describe('dashboard/find/top-employees-in-works (GET)', () => {
    let employees: Employee[];

    beforeAll(async () => {
      const result = await seedService.CreateWork({
        quantityEmployees: 5,
        date: dateWithPastYear,
      });

      employees = [...result.employees];

      seedService.CreateWorkForEmployee({
        employeeId: employees[0].id,
        date: dateWithCurrentYear,
      }),
        seedService.CreateWorkForEmployee({
          employeeId: employees[0].id,
          date: dateWithCurrentYear,
        }),
        seedService.CreateWorkForEmployee({
          employeeId: employees[1].id,
          date: dateWithCurrentYear,
        }),
        seedService.CreateWorkForEmployee({
          employeeId: employees[1].id,
          date: dateWithCurrentYear,
        }),
        await authService.addPermission(
          userTest.id,
          'find_top_employees_in_works_chart',
        );
    });

    it('should return the top 5 employees with the most works', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-works')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(body.total_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeLessThan(6);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record, index) => {
        if (index === 0 || index === 1) {
          expect(record.total_works).toBe(2);
          expect(record.value_pay_works).toBe(180_000);
        } else {
          expect(record.total_works).toBe(1);
          expect(record.value_pay_works).toBe(90_000);
        }

        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_works');
        expect(record).toHaveProperty('value_pay_works');
      });
    });

    it('should return the top 5 employees in current year', async () => {
      const queryData = {
        year: new Date(dateWithCurrentYear).getFullYear(),
      };

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-works')
        .set('Authorization', `Bearer ${token}`)
        .query(queryData)
        .expect(200);

      expect(body.total_row_count).toBe(2);
      expect(body.current_row_count).toBe(2);
      expect(body.current_row_count).toBeLessThan(6);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_works');
        expect(record).toHaveProperty('value_pay_works');
        expect(record.total_works).toBe(2);
        expect(record.value_pay_works).toBe(180_000);
      });
    });

    it('should return the top 5 employees in past year', async () => {
      const queryData = {
        year: new Date(dateWithPastYear).getFullYear(),
      };

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-works')
        .set('Authorization', `Bearer ${token}`)
        .query(queryData)
        .expect(200);

      expect(body.total_row_count).toBe(5);
      expect(body.current_row_count).toBe(5);
      expect(body.current_row_count).toBeLessThan(6);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_works');
        expect(record).toHaveProperty('value_pay_works');
        expect(record.total_works).toBe(1);
        expect(record.value_pay_works).toBe(90_000);
      });
    });
  });

  describe('dashboard/find/top-clients-in-sales (GET)', () => {
    let clients: Client[];

    beforeAll(async () => {
      const { crop, harvest } = await seedService.CreateHarvest({
        quantityEmployees: 5,
        amount: 400,
      });

      await seedService.CreateHarvestProcessed({
        cropId: crop.id,
        amount: 1600,
        harvestId: harvest.id,
      });

      const result = await Promise.all(
        Array.from({ length: 6 }).map(() => {
          return seedService.CreateSale({
            cropId: crop.id,
            date: dateWithPastYear,
          });
        }),
      );

      clients = result.map((r) => r.client);

      await seedService.CreateSale({
        cropId: crop.id,
        clientId: clients[0].id,
        date: dateWithCurrentYear,
      });
      await seedService.CreateSale({
        cropId: crop.id,
        clientId: clients[0].id,
        date: dateWithCurrentYear,
      });

      await seedService.CreateSale({
        cropId: crop.id,
        clientId: clients[1].id,
        date: dateWithCurrentYear,
      });
      await seedService.CreateSale({
        cropId: crop.id,
        clientId: clients[1].id,
        date: dateWithCurrentYear,
      });

      await authService.addPermission(
        userTest.id,
        'find_top_clients_in_sales_chart',
      );
    });

    it('should return the top 5 clients with the most sales', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-clients-in-sales')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(body.total_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeLessThan(6);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record, index) => {
        if (index === 0 || index === 1) {
          expect(record.total_value_pay).toBe(1_680_000);
          expect(record.total_amount).toBe(30);
        } else {
          expect(record.total_value_pay).toBe(840000);
          expect(record.total_amount).toBe(15);
        }

        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_value_pay');
        expect(record).toHaveProperty('total_amount');
      });
    });

    it('should return the top 5 clients in current year', async () => {
      const queryData = {
        year: new Date(dateWithCurrentYear).getFullYear(),
      };

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-clients-in-sales')
        .set('Authorization', `Bearer ${token}`)
        .query(queryData)
        .expect(200);

      expect(body.total_row_count).toBe(2);
      expect(body.current_row_count).toBe(2);
      expect(body.current_row_count).toBeLessThan(6);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_value_pay');
        expect(record).toHaveProperty('total_amount');
        expect(record.total_value_pay).toBe(1680000);
        expect(record.total_amount).toBe(30);
      });
    });

    it('should return the top 5 clients in past year', async () => {
      const queryData = {
        year: new Date(dateWithPastYear).getFullYear(),
      };

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-clients-in-sales')
        .set('Authorization', `Bearer ${token}`)
        .query(queryData)
        .expect(200);

      expect(body.total_row_count).toBe(5);
      expect(body.current_row_count).toBe(5);
      expect(body.current_row_count).toBeLessThan(6);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_value_pay');
        expect(record).toHaveProperty('total_amount');
        expect(record.total_value_pay).toBe(840000);
        expect(record.total_amount).toBe(15);
      });
    });
  });

  describe('dashboard/stock/all (GET)', () => {
    let crops: Crop[] = [];

    beforeAll(async () => {
      await cropsRepository.delete({});
      for (let index = 0; index < 5; index++) {
        const { harvest, crop } = await seedService.CreateHarvest({
          quantityEmployees: 1,
        });

        await seedService.CreateHarvestProcessed({
          cropId: crop.id,
          amount: 100,
          harvestId: harvest.id,
        });
        crops.push(crop);
      }

      await authService.addPermission(
        userTest.id,
        'find_all_crops_stock_chart',
      );
    }, 10_000);

    it('should return the crops with stock', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/stock/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(body.total_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeGreaterThan(0);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('name');
        expect(record).toHaveProperty('stock');
        expect(record.stock).toBe(100);
      });
    });
  });

  describe('dashboard/find/count-harvest-and-total-stock (GET)', () => {
    beforeAll(async () => {
      await harvestsRepository.delete({});
      for (let index = 0; index < 5; index++) {
        const { crop } = await seedService.CreateHarvest({
          quantityEmployees: 1,
          date: dateWithCurrentYear,
        });

        if (index === 0 || index === 1) {
          await seedService.CreateHarvestAdvanced({
            date: dateWithCurrentYear,
            cropId: crop.id,
          });
        }
      }

      for (let index = 0; index < 5; index++) {
        await seedService.CreateHarvest({
          quantityEmployees: 1,
          date: dateWithPastYear,
          amount: 200,
        });
      }

      await authService.addPermission(
        userTest.id,
        'find_count_harvests_and_total_stock_chart',
      );
    }, 10_000);

    it('should return the top 5 crops with harvest and stock in current year', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/count-harvest-and-total-stock')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(body.total_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeGreaterThan(0);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record, index) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('name');
        expect(record).toHaveProperty('total_harvests');
        expect(record).toHaveProperty('total_amount');
        if (index === 0 || index === 1) {
          expect(record.total_harvests).toBe(2);
          expect(record.total_amount).toBe(300);
        } else {
          expect(record.total_harvests).toBe(1);
          expect(record.total_amount).toBe(150);
        }
      });
    });

    it('should return the top 5 crops with harvest and stock in past year', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/count-harvest-and-total-stock')
        .query({ year: new Date(dateWithPastYear).getFullYear() })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(body.total_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeGreaterThan(0);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('name');
        expect(record).toHaveProperty('total_harvests');
        expect(record).toHaveProperty('total_amount');
        expect(record.total_harvests).toBe(1);
        expect(record.total_amount).toBe(200);
      });
    });
  });

  describe('dashboard/find/total-harvest-in-year (GET)', () => {
    beforeAll(async () => {
      await harvestsRepository.delete({});
      await authService.addPermission(
        userTest.id,
        'find_total_harvest_in_year_chart',
      );

      await Promise.all([
        // Crear cosechas en el año anterior
        await seedService.CreateHarvest({
          date: new Date('2024-01-01').toISOString(),
        }),
        await seedService.CreateHarvest({
          date: new Date('2024-02-01').toISOString(),
        }),
        await seedService.CreateHarvest({
          date: new Date('2024-03-01').toISOString(),
        }),
        await seedService.CreateHarvest({
          date: new Date('2024-04-01').toISOString(),
        }),

        // Crear cosechas en el año actual
        await seedService.CreateHarvest({
          date: new Date('2025-01-01').toISOString(),
        }),
        await seedService.CreateHarvest({
          date: new Date('2025-02-01').toISOString(),
        }),
        await seedService.CreateHarvest({
          date: new Date('2025-03-01').toISOString(),
        }),
        await seedService.CreateHarvest({
          date: new Date('2025-04-01').toISOString(),
        }),
      ]);
    });

    it('should return the total harvest in year - stable', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-harvest-in-year')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      

      expect(body).toHaveProperty('growth');
      expect(body.growth).toHaveProperty('growth_value');
      expect(body.growth).toHaveProperty('difference');
      expect(body.growth).toHaveProperty('status');
      expect(body.growth.status).toBe('stable');
      expect(body.growth).toHaveProperty('total_current');
      expect(body.growth.total_current).toBe(600);
      expect(body.growth).toHaveProperty('total_previous');
      expect(body.growth.total_previous).toBe(600);

      expect(body).toHaveProperty('years');

      body.years.forEach((year) => {
        expect(year).toHaveProperty('year');
        expect(year).toHaveProperty('data');
        year.data.forEach((month) => {
          expect(month).toHaveProperty('amount');
          expect(month).toHaveProperty('value_pay');
          expect(month).toHaveProperty('month_name');
          expect(month).toHaveProperty('month_number');
        });
      });
    });
    it('should return the total harvest in year - increment', async () => {
      await seedService.CreateHarvest({
        date: new Date('2025-05-01').toISOString(),
      });

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-harvest-in-year')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      

      expect(body).toHaveProperty('growth');
      expect(body.growth).toHaveProperty('growth_value');
      expect(body.growth).toHaveProperty('difference');
      expect(body.growth).toHaveProperty('status');
      expect(body.growth.status).toBe('increment');
      expect(body.growth).toHaveProperty('total_current');
      expect(body.growth.total_current).toBe(750);
      expect(body.growth).toHaveProperty('total_previous');
      expect(body.growth.total_previous).toBe(600);

      expect(body).toHaveProperty('years');

      body.years.forEach((year) => {
        expect(year).toHaveProperty('year');
        expect(year).toHaveProperty('data');
        year.data.forEach((month) => {
          expect(month).toHaveProperty('amount');
          expect(month).toHaveProperty('value_pay');
          expect(month).toHaveProperty('month_name');
          expect(month).toHaveProperty('month_number');
        });
      });
    });
    it('should return the total harvest in year - decrement', async () => {
      await seedService.CreateHarvest({
        date: new Date('2024-05-01').toISOString(),
        amount: 500,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-harvest-in-year')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      

      expect(body).toHaveProperty('growth');
      expect(body.growth).toHaveProperty('growth_value');
      expect(body.growth).toHaveProperty('difference');
      expect(body.growth).toHaveProperty('status');
      expect(body.growth.status).toBe('decrement');
      expect(body.growth).toHaveProperty('total_current');
      expect(body.growth.total_current).toBeGreaterThan(500);
      expect(body.growth).toHaveProperty('total_previous');
      expect(body.growth.total_previous).toBe(1100);

      expect(body).toHaveProperty('years');

      body.years.forEach((year) => {
        expect(year).toHaveProperty('year');
        expect(year).toHaveProperty('data');
        year.data.forEach((month) => {
          expect(month).toHaveProperty('amount');
          expect(month).toHaveProperty('value_pay');
          expect(month).toHaveProperty('month_name');
          expect(month).toHaveProperty('month_number');
        });
      });
    });

    it('should return invalid status for sending year with no records available to compare', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-harvest-in-year')
        .set('Authorization', `Bearer ${token}`)
        .query({ year: '2024' })
        .expect(200);
      

      expect(body).toHaveProperty('growth');
      expect(body.growth).toHaveProperty('growth_value');
      expect(body.growth).toHaveProperty('difference');
      expect(body.growth).toHaveProperty('status');
      expect(body.growth.status).toBe('no-valid');
      expect(body.growth).toHaveProperty('total_current');
      expect(body.growth).toHaveProperty('total_previous');

      expect(body).toHaveProperty('years');

      body.years.forEach((year) => {
        expect(year).toHaveProperty('year');
        expect(year).toHaveProperty('data');
        year.data.forEach((month) => {
          expect(month).toHaveProperty('amount');
          expect(month).toHaveProperty('value_pay');
          expect(month).toHaveProperty('month_name');
          expect(month).toHaveProperty('month_number');
        });
      });
    });
  });
  describe('dashboard/find/total-work-in-year (GET)', () => {
    beforeAll(async () => {
      await worksRepository.delete({});
      await authService.addPermission(
        userTest.id,
        'find_total_work_in_year_chart',
      );

      await Promise.all([
        // Crear cosechas en el año anterior
        await seedService.CreateWork({
          date: new Date('2024-01-01').toISOString(),
        }),
        await seedService.CreateWork({
          date: new Date('2024-02-01').toISOString(),
        }),
        await seedService.CreateWork({
          date: new Date('2024-03-01').toISOString(),
        }),
        await seedService.CreateWork({
          date: new Date('2024-04-01').toISOString(),
        }),

        // Crear cosechas en el año actual
        await seedService.CreateWork({
          date: new Date('2025-01-01').toISOString(),
        }),
        await seedService.CreateWork({
          date: new Date('2025-02-01').toISOString(),
        }),
        await seedService.CreateWork({
          date: new Date('2025-03-01').toISOString(),
        }),
        await seedService.CreateWork({
          date: new Date('2025-04-01').toISOString(),
        }),
      ]);
    });

    it('should return the total work in year', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-work-in-year')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      

      expect(body).toHaveProperty('years');

      body.years.forEach((year) => {
        expect(year).toHaveProperty('year');
        expect(year).toHaveProperty('data');

        expect(year.data).toBeInstanceOf(Array);

        year.data.forEach((month) => {
          expect(month).toHaveProperty('quantity_works');
          expect(month).toHaveProperty('value_pay');
          expect(month).toHaveProperty('month_name');
          expect(month).toHaveProperty('month_number');
        });
      });
    });
  });
  describe('dashboard/find/total-sales-in-year (GET)', () => {
    beforeAll(async () => {
      await salesRepository.delete({});
      await authService.addPermission(
        userTest.id,
        'find_total_sales_in_year_chart',
      );

      await Promise.all([
        // Crear cosechas en el año anterior
        await seedService.CreateSaleGeneric({
          date: new Date('2024-01-01').toISOString(),
        }),
        await seedService.CreateSaleGeneric({
          date: new Date('2024-02-01').toISOString(),
        }),
        await seedService.CreateSaleGeneric({
          date: new Date('2024-03-01').toISOString(),
        }),
        await seedService.CreateSaleGeneric({
          date: new Date('2024-04-01').toISOString(),
        }),
        // Crear cosechas en el año actual
        await seedService.CreateSaleGeneric({
          date: new Date('2025-01-01').toISOString(),
        }),
        await seedService.CreateSaleGeneric({
          date: new Date('2025-02-01').toISOString(),
        }),
        await seedService.CreateSaleGeneric({
          date: new Date('2025-03-01').toISOString(),
        }),
        await seedService.CreateSaleGeneric({
          date: new Date('2025-04-01').toISOString(),
        }),
      ]);
    }, 15_000);

    it('should return the total sales in year', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-sales-in-year')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      

      expect(body).toHaveProperty('years');

      body.years.forEach((year) => {
        expect(year).toHaveProperty('year');
        expect(year).toHaveProperty('data');

        expect(year.data).toBeInstanceOf(Array);

        year.data.forEach((month) => {
          expect(month).toHaveProperty('amount');
          expect(month).toHaveProperty('value_pay');
          expect(month).toHaveProperty('month_name');
          expect(month).toHaveProperty('month_number');
        });
      });
    });
  });

  describe('dashboard/find/total-consumptions-in-year (GET)', () => {
    beforeAll(async () => {
      await consumptionsRepository.delete({});
      await authService.addPermission(
        userTest.id,
        'find_total_consumptions_in_year_chart',
      );

      await Promise.all([
        // Crear cosechas en el año anterior
        await seedService.CreateConsumptionExtended({
          date: new Date('2024-01-01').toISOString(),
        }),
        await seedService.CreateConsumptionExtended({
          date: new Date('2024-02-01').toISOString(),
        }),
        await seedService.CreateConsumptionExtended({
          date: new Date('2024-03-01').toISOString(),
        }),
        await seedService.CreateConsumptionExtended({
          date: new Date('2024-04-01').toISOString(),
        }),
        // Crear cosechas en el año actual
        await seedService.CreateConsumptionExtended({
          date: new Date('2025-01-01').toISOString(),
        }),
        await seedService.CreateConsumptionExtended({
          date: new Date('2025-02-01').toISOString(),
        }),
        await seedService.CreateConsumptionExtended({
          date: new Date('2025-03-01').toISOString(),
        }),
        await seedService.CreateConsumptionExtended({
          date: new Date('2025-04-01').toISOString(),
        }),
      ]);
    }, 15_000);

    it('should return the total consumptions in year', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-consumptions-in-year')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      

      expect(body).toHaveProperty('years');

      body.years.forEach((year) => {
        expect(year).toHaveProperty('year');
        expect(year).toHaveProperty('data');

        expect(year.data).toBeInstanceOf(Array);

        year.data.forEach((month) => {
          expect(month).toHaveProperty('quantity_consumptions');
          expect(month).toHaveProperty('month_name');
          expect(month).toHaveProperty('month_number');
        });
      });
    });
  });

  describe('should throw an exception because the user JWT does not have permissions for these actions', () => {
    beforeAll(async () => {
      const result = await Promise.all([
        authService.removePermission(
          userTest.id,
          'find_top_employees_in_harvests_chart',
        ),
        authService.removePermission(
          userTest.id,
          'find_top_employees_in_works_chart',
        ),
        authService.removePermission(
          userTest.id,
          'find_top_clients_in_sales_chart',
        ),
        authService.removePermission(userTest.id, 'find_all_crops_stock_chart'),
        authService.removePermission(
          userTest.id,
          'find_count_harvests_and_total_stock_chart',
        ),
        authService.removePermission(
          userTest.id,
          'find_total_harvest_in_year_chart',
        ),
        authService.removePermission(
          userTest.id,
          'find_total_work_in_year_chart',
        ),
        authService.removePermission(
          userTest.id,
          'find_total_sales_in_year_chart',
        ),
        authService.removePermission(
          userTest.id,
          'find_total_consumptions_in_year_chart',
        ),
      ]);
    });

    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/top-employees-in-harvests', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-harvests')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/top-employees-in-wor ks', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-works')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/top-clients-in-sales', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-clients-in-sales')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/stock/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/stock/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/count-harvest-and-total-stock', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/count-harvest-and-total-stock')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/total-harvest  -in-year', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-harvest-in-year')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/total-work-in-year', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-work-in-year')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/total-sales-in-year', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-sales-in-year')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/total-consumptions-in-year', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-consumptions-in-year')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });
});
