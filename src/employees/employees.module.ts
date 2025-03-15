import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { Employee } from './entities/employee.entity';
import { CommonModule } from 'src/common/common.module';
import { PrinterModule } from 'src/printer/printer.module';

@Module({
  imports: [TypeOrmModule.forFeature([Employee]), PrinterModule, CommonModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService, TypeOrmModule],
})
export class EmployeesModule {}
