import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from './clients/clients.module';
import { CommonModule } from './common/common.module';
import { CropsModule } from './crops/crops.module';
import { EmployeesModule } from './employees/employees.module';
import { HarvestModule } from './harvest/harvest.module';
import { SalesModule } from './sales/sales.module';
import { SeedModule } from './seed/seed.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SuppliesModule } from './supplies/supplies.module';
import { UsersModule } from './users/users.module';
import { WorkModule } from './work/work.module';
import { PaymentsModule } from './payments/payments.module';
import { AuthModule } from './auth/auth.module';
import { PrinterModule } from './printer/printer.module';
import { ConsumptionsModule } from './consumptions/consumptions.module';
import { ShoppingModule } from './shopping/shopping.module';
import { DashboardModule } from './dashboard/dashboard.module';
import * as fs from 'fs';
import * as path from 'path';
import { TenantsModule } from './tenants/tenants.module';
import { Tenant } from './tenants/entities/tenant.entity';
import { TenantDatabase } from './tenants/entities/tenant-database.entity';
import { TenantAdministrator } from './tenants/entities/tenant-administrator.entity';
import { TenantMiddleware } from './tenants/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const statusProject =
          configService.get<string>('STATUS_PROJECT') || 'development';
        const caCertPath = configService.get<string>('DB_CA_CERT_PATH');
        let sslOptions: Record<string, unknown> = { rejectUnauthorized: true };
        if (
          caCertPath &&
          fs.existsSync(path.resolve(__dirname, '..', caCertPath))
        ) {
          sslOptions.ca = fs
            .readFileSync(path.resolve(__dirname, '..', caCertPath))
            .toString();
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: 'cropco_management',
          entities: [Tenant, TenantDatabase, TenantAdministrator],
          synchronize: true,
          ssl: false,
          logging: true,
        };
      },
    }),
    TenantsModule,
    AuthModule,
    ClientsModule,
    CommonModule,
    CropsModule,
    EmployeesModule,
    HarvestModule,
    ...(process.env.STATUS_PROJECT === 'development' ? [SeedModule] : []),
    SuppliersModule,
    SuppliesModule,
    UsersModule,
    WorkModule,
    SalesModule,
    PaymentsModule,
    PrinterModule,
    ConsumptionsModule,
    ShoppingModule,
    DashboardModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'tenants/(.*)', method: RequestMethod.ALL },
        // {
        //   path: 'tenants/one/find/:TenantSubdomain',
        //   method: RequestMethod.GET,
        // },
        // {
        //   path: '/tenants/create',
        //   method: RequestMethod.POST,
        // },
        // {
        //   path: '/tenants/one/config-db/:id',
        //   method: RequestMethod.PUT,
        // },
        {
          path: '/auth/management/login',
          method: RequestMethod.POST,
        },
        // {
        //   path: '/tenants/create/admin',
        //   method: RequestMethod.POST,
        // },
        // {
        //   path: '/tenants/all',
        //   method: RequestMethod.GET,
        // },
        // {
        //   path: '/tenants/one/:id',
        //   method: RequestMethod.ALL,
        // },

        // { path: 'tenants/create', method: RequestMethod.POST },
        // { path: 'tenants/all', method: RequestMethod.GET },
        // { path: 'tenants/one/:id', method: RequestMethod.GET },
        // { path: 'tenants/one/update/:id', method: RequestMethod.PATCH },
        // { path: 'tenants/remove/one/:id', method: RequestMethod.DELETE },
        // { path: 'tenants/one/config-db/:id', method: RequestMethod.PUT },
      )
      .forRoutes('*');
  }
}
