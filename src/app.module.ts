import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from './clients/clients.module';
import { CommonModule } from './common/common.module';
import { CropsModule } from './crops/crops.module';
import { EmployeesModule } from './employees/employees.module';
import { HarvestModule } from './harvest/harvest.module';
import { SeedModule } from './seed/seed.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SuppliesModule } from './supplies/supplies.module';
import { Client } from './clients/entities/client.entity';
import { Crop } from './crops/entities/crop.entity';
import { Employee } from './employees/entities/employee.entity';
import { Harvest } from './harvest/entities/harvest.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { Supply } from './supplies/entities/supply.entity';
import { User } from './users/entities/user.entity';
import { HarvestDetails } from './harvest/entities/harvest-details.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'admin',
      database: 'cropco',
      entities: [
        Client,
        Crop,
        Employee,
        Harvest,
        Supplier,
        Supply,
        User,
        HarvestDetails,
      ],
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
  ],
})
export class AppModule {}
