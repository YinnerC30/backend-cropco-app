import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      logging: true,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),

    ClientsModule,
    CommonModule,
    CropsModule,
    EmployeesModule,
    HarvestModule,
    SeedModule,
    SuppliersModule,
    SuppliesModule,
    UsersModule,
    WorkModule,
    SalesModule,
    PaymentsModule,
  ],
})
export class AppModule {}
