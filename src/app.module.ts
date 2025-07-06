import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { CommonModule } from './common/common.module';
import { ConsumptionsModule } from './consumptions/consumptions.module';
import { CropsModule } from './crops/crops.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmployeesModule } from './employees/employees.module';
import { HarvestModule } from './harvest/harvest.module';
import { PaymentsModule } from './payments/payments.module';
import { PrinterModule } from './printer/printer.module';
import { SalesModule } from './sales/sales.module';
import { SeedModule } from './seed/seed.module';
import { ShoppingModule } from './shopping/shopping.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SuppliesModule } from './supplies/supplies.module';
import { TenantDatabase } from './tenants/entities/tenant-database.entity';
import { Tenant } from './tenants/entities/tenant.entity';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { WorkModule } from './work/work.module';

import { AdministratorsModule } from './administrators/administrators.module';
import { Administrator } from './administrators/entities/administrator.entity';
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
        const isDevelopmentMode: boolean =
          configService.get<string>('STATUS_PROJECT') === 'development';
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          entities: [Tenant, TenantDatabase, Administrator],
          synchronize: isDevelopmentMode,
          ssl: false,
          logging: isDevelopmentMode,
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
    ...(process.env.STATUS_PROJECT === 'development' ? [SeedModule] : []),
  ],
})
export class AppModule {
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
          path: '/auth/management/logout',
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
