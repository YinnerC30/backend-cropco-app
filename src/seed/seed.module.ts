import { Module } from '@nestjs/common';

import { UsersModule } from './../users/users.module';

import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { CropsModule } from 'src/crops/crops.module';
import { EmployeesModule } from 'src/employees/employees.module';
import { ClientsModule } from 'src/clients/clients.module';
import { SuppliersModule } from 'src/suppliers/suppliers.module';

@Module({
  controllers: [SeedController],
  providers: [SeedService],
  imports: [
    UsersModule,
    CropsModule,
    EmployeesModule,
    ClientsModule,
    SuppliersModule,
  ],
})
export class SeedModule {}
