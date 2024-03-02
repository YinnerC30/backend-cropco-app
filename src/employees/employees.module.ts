import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { DatabaseModule } from 'src/database/database.module';
import { employeeProviders } from './employees.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [EmployeesController],
  providers: [...employeeProviders, EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
