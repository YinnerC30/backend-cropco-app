import { Module } from '@nestjs/common';
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
          // entities: [__dirname + '/tenants/*.entity{.ts,.js}'],
          entities: [Tenant, TenantDatabase, TenantAdministrator],
          // synchronize: statusProject === 'development',
          synchronize: true,
          ssl: false,
          logging: true,
          // ssl: false,
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
export class AppModule {}
