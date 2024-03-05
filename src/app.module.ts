import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { CropsModule } from './crops/crops.module';
import { CommonModule } from './common/common.module';
import { SeedModule } from './seed/seed.module';
import { EmployeesModule } from './employees/employees.module';
import { ClientsModule } from './clients/clients.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SuppliesModule } from './supplies/supplies.module';
import { HarvestModule } from './harvest/harvest.module';

@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    ConfigModule.forRoot(),
    CropsModule,
    CommonModule,
    SeedModule,
    EmployeesModule,
    ClientsModule,
    SuppliersModule,
    SuppliesModule,
    HarvestModule,
  ],
})
export class AppModule {}
