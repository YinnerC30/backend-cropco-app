import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { EmployeesModule } from 'src/employees/employees.module';
import { ClientsModule } from 'src/clients/clients.module';
import { CropsModule } from 'src/crops/crops.module';
import { HarvestModule } from 'src/harvest/harvest.module';
import { SalesModule } from 'src/sales/sales.module';
import { ConsumptionsModule } from 'src/consumptions/consumptions.module';
import { WorkModule } from 'src/work/work.module';

@Module({
  controllers: [DashboardController],
  imports: [
    EmployeesModule,
    ClientsModule,
    CropsModule,
    HarvestModule,
    WorkModule,
    SalesModule,
    ConsumptionsModule,
  ],
})
export class DashboardModule {}
