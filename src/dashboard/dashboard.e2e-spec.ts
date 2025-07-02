import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import cookieParser from 'cookie-parser';
import { Administrator } from 'src/administrators/entities/administrator.entity';
import { AuthModule } from 'src/auth/auth.module';
import { ClientsModule } from 'src/clients/clients.module';
import { Client } from 'src/clients/entities/client.entity';
import { CommonModule } from 'src/common/common.module';
import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { RequestTools } from 'src/seed/helpers/RequestTools';
import { SeedModule } from 'src/seed/seed.module';
import { TenantDatabase } from 'src/tenants/entities/tenant-database.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { TenantMiddleware } from 'src/tenants/middleware/tenant.middleware';
import { TenantsModule } from 'src/tenants/tenants.module';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { DashboardModule } from './dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.test',
      isGlobal: true,
    }),
    TenantsModule,
    ClientsModule,
    DashboardModule,
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
          database: 'cropco_management',
          entities: [Tenant, TenantDatabase, Administrator],
          synchronize: true,
          ssl: false,
        };
      },
    }),
    CommonModule,
    SeedModule,
    AuthModule,
  ],
})
export class TestAppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'administrators/(.*)', method: RequestMethod.ALL },
        { path: 'tenants/(.*)', method: RequestMethod.ALL },
        {
          path: '/auth/management/login',
          method: RequestMethod.POST,
        },
        {
          path: '/auth/management/check-status',
          method: RequestMethod.GET,
        },
      )
      .forRoutes('*');
  }
}

describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  // let seedService: SeedService;
  // let authService: AuthService;

  let userTest: User;
  let token: string;

  let dateWithCurrentYear: string;
  let dateWithPastYear: string;

  let reqTools: RequestTools;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    // authService = moduleFixture.get<AuthService>(AuthService);

    app = moduleFixture.createNestApplication();

    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        errorHttpStatusCode: 400,
        transform: true,
      }),
    );

    await app.init();

    reqTools = new RequestTools({ moduleFixture });
    reqTools.setApp(app);
    await reqTools.initializeTenant();
    tenantId = reqTools.getTenantIdPublic();

    await reqTools.clearDatabaseControlled({
      employees: true,
      harvests: true,
      works: true,
      sales: true,
      payments: true,
    });

    userTest = await reqTools.createTestUser();
    token = await reqTools.generateTokenUser();

    dateWithCurrentYear = InformationGenerator.generateRandomDate({});
    dateWithPastYear = InformationGenerator.generateRandomDate({
      yearsToAdd: -1,
    });
  });

  afterAll(async () => {
    await reqTools.deleteTestUser();
    await app.close();
  });

  describe('dashboard/find/top-employees-in-harvests (GET)', () => {
    let employees: Employee[];

    beforeAll(async () => {
      const result = await reqTools.CreateHarvest({
        quantityEmployees: 5,
        date: dateWithPastYear,
      });

      employees = [...result.employees];

      await Promise.all([
        reqTools.CreateHarvest({
          employeeId: employees[0].id,
          date: dateWithCurrentYear,
        }),
        reqTools.CreateHarvest({
          employeeId: employees[1].id,
          date: dateWithCurrentYear,
        }),
      ]);

      await reqTools.addActionToUser('find_top_employees_in_harvests_chart');
    });

    it('should return the top 5 employees with the most harvests', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-harvests')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(body.total_row_count).toBe(2);
      expect(body.current_row_count).toBe(2);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record, index) => {
        // if (index === 0 || index === 1) {
        //   expect(record.total_harvests_amount).toBe(300);
        //   expect(record.total_value_pay).toBe(180000);
        // } else {
        //   expect(record.total_harvests_amount).toBe(150);
        //   expect(record.total_value_pay).toBe(90_000);
        // }

        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_harvests_amount');
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
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .query(queryData)
        .expect(200);

      expect(body.total_row_count).toBe(2);
      expect(body.current_row_count).toBe(2);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record, index) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_harvests_amount');
        expect(record).toHaveProperty('total_value_pay');
        expect(record.total_harvests_amount).toBe(150);
        expect(record.total_value_pay).toBe(90_000);
      });
    });

    it('should return the top 5 employees in past year', async () => {
      const queryData = {
        year: new Date(dateWithPastYear).getFullYear(),
      };

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-harvests')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .query(queryData)
        .expect(200);

      expect(body.total_row_count).toBe(5);
      expect(body.current_row_count).toBe(5);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_harvests_amount');
        expect(record).toHaveProperty('total_value_pay');
        expect(record.total_harvests_amount).toBe(150);
        expect(record.total_value_pay).toBe(90_000);
      });
    });
  });

  describe('dashboard/find/top-employees-in-works (GET)', () => {
    let employees: Employee[];

    beforeAll(async () => {
      const result = await reqTools.CreateWork({
        quantityEmployees: 5,
        date: dateWithPastYear,
      });

      employees = [...result.employees];

      await reqTools.CreateWork({
        employeeId: employees[0].id,
        date: dateWithCurrentYear,
      });
      await reqTools.CreateWork({
        employeeId: employees[1].id,
        date: dateWithCurrentYear,
      });
      // await reqTools.CreateWork({
      //   employeeId: employees[2].id,
      //   date: dateWithCurrentYear,
      // });

      // seedService.CreateWorkForEmployee({
      //   employeeId: employees[0].id,
      //   date: dateWithCurrentYear,
      // }),
      //   seedService.CreateWorkForEmployee({
      //     employeeId: employees[0].id,
      //     date: dateWithCurrentYear,
      //   }),
      //   seedService.CreateWorkForEmployee({
      //     employeeId: employees[1].id,
      //     date: dateWithCurrentYear,
      //   }),
      //   seedService.CreateWorkForEmployee({
      //     employeeId: employees[1].id,
      //     date: dateWithCurrentYear,
      //   }),
      await reqTools.addActionForUser(
        userTest.id,
        'find_top_employees_in_works_chart',
      );
    });

    it('should return the top 5 employees with the most works', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-works')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(body.total_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeLessThan(6);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record, index) => {
        // if (index === 0 || index === 1) {
        //   expect(record.total_works).toBe(2);
        //   expect(record.value_pay_works).toBe(180_000);
        // } else {
        //   expect(record.total_works).toBe(1);
        //   expect(record.value_pay_works).toBe(90_000);
        // }

        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('total_works');
        expect(record).toHaveProperty('total_value_pay');
      });
    });

    it('should return the top 5 employees in current year', async () => {
      const queryData = {
        year: new Date(dateWithCurrentYear).getFullYear(),
      };

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-works')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
        expect(record).toHaveProperty('total_value_pay');
        expect(record.total_works).toBe(1);
        expect(record.total_value_pay).toBe(90_000);
      });
    });

    it('should return the top 5 employees in past year', async () => {
      const queryData = {
        year: new Date(dateWithPastYear).getFullYear(),
      };

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-works')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
        expect(record).toHaveProperty('total_value_pay');
        expect(record.total_works).toBe(1);
        expect(record.total_value_pay).toBe(90_000);
      });
    });
  });

  describe('dashboard/find/top-clients-in-sales (GET)', () => {
    let clients: Client[];

    beforeAll(async () => {
      const { crop, harvest } = await reqTools.CreateHarvest({
        quantityEmployees: 5,
        amount: 400,
      });

      await reqTools.CreateHarvestProcessed({
        cropId: crop.id,
        amount: 1600,
        harvestId: harvest.id,
      });

      const result = await Promise.all(
        Array.from({ length: 6 }).map(() => {
          return reqTools.CreateSale({
            cropId: crop.id,
            date: dateWithPastYear,
          });
        }),
      );

      clients = result.map((r) => r.client);

      await reqTools.CreateSale({
        cropId: crop.id,
        clientId: clients[0].id,
        date: dateWithCurrentYear,
      });
      // await reqTools.CreateSale({
      //   cropId: crop.id,
      //   clientId: clients[0].id,
      //   date: dateWithCurrentYear,
      // });

      // await reqTools.CreateSale({
      //   cropId: crop.id,
      //   clientId: clients[1].id,
      //   date: dateWithCurrentYear,
      // });
      await reqTools.CreateSale({
        cropId: crop.id,
        clientId: clients[1].id,
        date: dateWithCurrentYear,
      });

      await reqTools.addActionForUser(
        userTest.id,
        'find_top_clients_in_sales_chart',
      );
    }, 15_000);

    it('should return the top 5 clients with the most sales', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-clients-in-sales')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(body.total_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeGreaterThan(0);
      expect(body.current_row_count).toBeLessThan(6);
      expect(body.total_page_count).toBe(1);
      expect(body.current_page_count).toBe(1);
      expect(body.records).toBeInstanceOf(Array);

      body.records.forEach(async (record, index) => {
        // if (index === 0 || index === 1) {
        //   expect(record.total_value_pay).toBe(1_680_000);
        //   expect(record.total_amount).toBe(30);
        // } else {
        //   expect(record.total_value_pay).toBe(840000);
        //   expect(record.total_amount).toBe(15);
        // }

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
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
        expect(record.total_value_pay).toBe(840000);
        expect(record.total_amount).toBe(15);
      });
    });

    it('should return the top 5 clients in past year', async () => {
      const queryData = {
        year: new Date(dateWithPastYear).getFullYear(),
      };

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-clients-in-sales')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
      // await cropsRepository.delete({});
      await reqTools.clearDatabaseControlled({ crops: true });
      for (let index = 0; index < 5; index++) {
        const { harvest, crop } = await reqTools.CreateHarvest({
          quantityEmployees: 1,
        });

        await reqTools.CreateHarvestProcessed({
          cropId: crop.id,
          amount: 100,
          harvestId: harvest.id,
        });
        crops.push(crop);
      }

      await reqTools.addActionForUser(
        userTest.id,
        'find_all_crops_stock_chart',
      );
    }, 10_000);

    it('should return the crops with stock', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/stock/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
      await reqTools.clearDatabaseControlled({ harvests: true });
      for (let index = 0; index < 5; index++) {
        const { crop } = await reqTools.CreateHarvest({
          quantityEmployees: 1,
          date: dateWithCurrentYear,
        });

        // if (index === 0 || index === 1) {
        //   await seedService.CreateHarvestAdvanced({
        //     date: dateWithCurrentYear,
        //     cropId: crop.id,
        //   });
        // }
      }

      for (let index = 0; index < 5; index++) {
        await reqTools.CreateHarvest({
          quantityEmployees: 1,
          date: dateWithPastYear,
          amount: 200,
        });
      }

      await reqTools.addActionForUser(
        userTest.id,
        'find_count_harvests_and_total_stock_chart',
      );
    }, 10_000);

    it('should return the top 5 crops with harvest and stock in current year', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/count-harvest-and-total-stock')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
        // if (index === 0 || index === 1) {
        //   expect(record.total_harvests).toBe(2);
        //   expect(record.total_amount).toBe(300);
        // } else {
        //   expect(record.total_harvests).toBe(1);
        //   expect(record.total_amount).toBe(150);
        // }
      });
    });

    it('should return the top 5 crops with harvest and stock in past year', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/count-harvest-and-total-stock')
        .query({ year: new Date(dateWithPastYear).getFullYear() })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
      await reqTools.clearDatabaseControlled({ harvests: true });
      await reqTools.addActionForUser(
        userTest.id,
        'find_total_harvest_in_year_chart',
      );

      await Promise.all([
        // Crear cosechas en el año anterior
        await reqTools.CreateHarvest({
          date: new Date('2024-01-01').toISOString(),
        }),
        await reqTools.CreateHarvest({
          date: new Date('2024-02-01').toISOString(),
        }),
        await reqTools.CreateHarvest({
          date: new Date('2024-03-01').toISOString(),
        }),
        await reqTools.CreateHarvest({
          date: new Date('2024-04-01').toISOString(),
        }),

        // Crear cosechas en el año actual
        await reqTools.CreateHarvest({
          date: new Date('2025-01-01').toISOString(),
        }),
        await reqTools.CreateHarvest({
          date: new Date('2025-02-01').toISOString(),
        }),
        await reqTools.CreateHarvest({
          date: new Date('2025-03-01').toISOString(),
        }),
        await reqTools.CreateHarvest({
          date: new Date('2025-04-01').toISOString(),
        }),
      ]);
    });

    it('should return the total harvest in year - stable', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-harvest-in-year')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
      await reqTools.CreateHarvest({
        date: new Date('2025-05-01').toISOString(),
      });

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-harvest-in-year')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
      await reqTools.CreateHarvest({
        date: new Date('2024-05-01').toISOString(),
        amount: 500,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-harvest-in-year')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
      await reqTools.clearDatabaseControlled({ works: true });
      await reqTools.addActionForUser(
        userTest.id,
        'find_total_work_in_year_chart',
      );

      await Promise.all([
        // Crear cosechas en el año anterior
        await reqTools.CreateWork({
          date: new Date('2024-01-01').toISOString(),
        }),
        await reqTools.CreateWork({
          date: new Date('2024-02-01').toISOString(),
        }),
        await reqTools.CreateWork({
          date: new Date('2024-03-01').toISOString(),
        }),
        await reqTools.CreateWork({
          date: new Date('2024-04-01').toISOString(),
        }),

        // Crear cosechas en el año actual
        await reqTools.CreateWork({
          date: new Date('2025-01-01').toISOString(),
        }),
        await reqTools.CreateWork({
          date: new Date('2025-02-01').toISOString(),
        }),
        await reqTools.CreateWork({
          date: new Date('2025-03-01').toISOString(),
        }),
        await reqTools.CreateWork({
          date: new Date('2025-04-01').toISOString(),
        }),
      ]);
    });

    it('should return the total work in year', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-work-in-year')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
      await reqTools.clearDatabaseControlled({ sales: true });
      await reqTools.addActionForUser(
        userTest.id,
        'find_total_sales_in_year_chart',
      );

      await Promise.all([
        // Crear cosechas en el año anterior
        await reqTools.CreateSale({
          date: new Date('2024-01-01').toISOString(),
          variant: 'generic',
        }),
        await reqTools.CreateSale({
          date: new Date('2024-02-01').toISOString(),
          variant: 'generic',
        }),
        await reqTools.CreateSale({
          date: new Date('2024-03-01').toISOString(),
          variant: 'generic',
        }),
        await reqTools.CreateSale({
          date: new Date('2024-04-01').toISOString(),
          variant: 'generic',
        }),
        // Crear cosechas en el año actual
        await reqTools.CreateSale({
          date: new Date('2025-01-01').toISOString(),
          variant: 'generic',
        }),
        await reqTools.CreateSale({
          date: new Date('2025-02-01').toISOString(),
          variant: 'generic',
        }),
        await reqTools.CreateSale({
          date: new Date('2025-03-01').toISOString(),
          variant: 'generic',
        }),
        await reqTools.CreateSale({
          date: new Date('2025-04-01').toISOString(),
          variant: 'generic',
        }),
      ]);
    }, 15_000);

    it('should return the total sales in year', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-sales-in-year')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
      await reqTools.clearDatabaseControlled({ consumptionSupplies: true });
      await reqTools.addActionForUser(
        userTest.id,
        'find_total_consumptions_in_year_chart',
      );

      await Promise.all([
        // Crear cosechas en el año anterior
        await reqTools.CreateConsumption({
          date: new Date('2024-01-01').toISOString(),
        }),
        await reqTools.CreateConsumption({
          date: new Date('2024-02-01').toISOString(),
        }),
        await reqTools.CreateConsumption({
          date: new Date('2024-03-01').toISOString(),
        }),
        await reqTools.CreateConsumption({
          date: new Date('2024-04-01').toISOString(),
        }),
        // Crear cosechas en el año actual
        await reqTools.CreateConsumption({
          date: new Date('2025-01-01').toISOString(),
        }),
        await reqTools.CreateConsumption({
          date: new Date('2025-02-01').toISOString(),
        }),
        await reqTools.CreateConsumption({
          date: new Date('2025-03-01').toISOString(),
        }),
        await reqTools.CreateConsumption({
          date: new Date('2025-04-01').toISOString(),
        }),
      ]);
    }, 15_000);

    it('should return the total consumptions in year', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-consumptions-in-year')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_top_employees_in_harvests_chart',
        ),
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_top_employees_in_works_chart',
        ),
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_top_clients_in_sales_chart',
        ),
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_all_crops_stock_chart',
        ),
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_count_harvests_and_total_stock_chart',
        ),
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_total_harvest_in_year_chart',
        ),
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_total_work_in_year_chart',
        ),
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_total_sales_in_year_chart',
        ),
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_total_consumptions_in_year_chart',
        ),
      ]);
    });

    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/top-employees-in-harvests', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-harvests')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/top-employees-in-wor ks', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-employees-in-works')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/top-clients-in-sales', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/top-clients-in-sales')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/stock/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/stock/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/count-harvest-and-total-stock', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/count-harvest-and-total-stock')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/total-harvest  -in-year', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-harvest-in-year')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/total-work-in-year', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-work-in-year')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/total-sales-in-year', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-sales-in-year')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action /dashboard/find/total-consumptions-in-year', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/dashboard/find/total-consumptions-in-year')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });
});
