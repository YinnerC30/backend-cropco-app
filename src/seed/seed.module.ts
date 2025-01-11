import { Module } from '@nestjs/common';

import { UsersModule } from './../users/users.module';

import { ClientsModule } from 'src/clients/clients.module';
import { CropsModule } from 'src/crops/crops.module';
import { EmployeesModule } from 'src/employees/employees.module';
import { HarvestModule } from 'src/harvest/harvest.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { SalesModule } from 'src/sales/sales.module';
import { SuppliersModule } from 'src/suppliers/suppliers.module';
import { SuppliesModule } from 'src/supplies/supplies.module';
import { WorkModule } from 'src/work/work.module';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [SeedController],
  providers: [SeedService],
  imports: [
    UsersModule,
    CropsModule,
    EmployeesModule,
    ClientsModule,
    SuppliersModule,
    SuppliesModule,
    HarvestModule,
    WorkModule,
    SalesModule,
    PaymentsModule,
    AuthModule,
  ],
})
export class SeedModule {}
