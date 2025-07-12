import {
  Global,
  MiddlewareConsumer,
  Module,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdministratorsModule } from 'src/administrators/administrators.module';

import { Administrator } from 'src/administrators/entities/administrator.entity';
import { AuthModule } from 'src/auth/auth.module';
import { ClientsModule } from 'src/clients/clients.module';
import { CommonModule } from 'src/common/common.module';
import { rateLimitConfig } from 'src/common/config/rate-limit.config';
import { ConsumptionsModule } from 'src/consumptions/consumptions.module';
import { CropsModule } from 'src/crops/crops.module';
import { DashboardModule } from 'src/dashboard/dashboard.module';
import { EmployeesModule } from 'src/employees/employees.module';
import { HarvestModule } from 'src/harvest/harvest.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { PrinterModule } from 'src/printer/printer.module';
import { SalesModule } from 'src/sales/sales.module';
import { SeedModule } from 'src/seed/seed.module';
import { ShoppingModule } from 'src/shopping/shopping.module';
import { SuppliersModule } from 'src/suppliers/suppliers.module';
import { SuppliesModule } from 'src/supplies/supplies.module';
import { TenantDatabase } from 'src/tenants/entities/tenant-database.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { TenantMiddleware } from 'src/tenants/middleware/tenant.middleware';
import { TenantsModule } from 'src/tenants/tenants.module';
import { UsersModule } from 'src/users/users.module';
import { WorkModule } from 'src/work/work.module';

@Global()
@Module({
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
          database: 'cropco_management',
          entities: [Tenant, TenantDatabase, Administrator],
          synchronize: true,
          ssl: false,
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: rateLimitConfig.testing.ttl,
        limit: rateLimitConfig.testing.limit,
      },
    ]),
    TenantsModule,
    AuthModule,
    ClientsModule,
    CommonModule,
    CropsModule,
    EmployeesModule,
    HarvestModule,
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
    AdministratorsModule,
    SeedModule,
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
