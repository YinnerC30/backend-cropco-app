import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from './clients/clients.module';
import { Client } from './clients/entities/client.entity';
import { CommonModule } from './common/common.module';
import { CropsModule } from './crops/crops.module';
import { Crop } from './crops/entities/crop.entity';
import { EmployeesModule } from './employees/employees.module';
import { Employee } from './employees/entities/employee.entity';
import { HarvestDetails } from './harvest/entities/harvest-details.entity';
import { HarvestStock } from './harvest/entities/harvest-stock.entity';
import { Harvest } from './harvest/entities/harvest.entity';
import { HarvestModule } from './harvest/harvest.module';
import { SeedModule } from './seed/seed.module';
import { Supplier } from './suppliers/entities/supplier.entity';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SuppliesConsumptionDetails } from './supplies/entities/supplies-consumption-details.entity';
import { SuppliesConsumption } from './supplies/entities/supplies-consumption.entity';
import { SuppliesPurchaseDetails } from './supplies/entities/supplies-purchase-details.entity';
import { SuppliesPurchase } from './supplies/entities/supplies-purchase.entity';
import { SuppliesStock } from './supplies/entities/supplies-stock.entity';
import { Supply } from './supplies/entities/supply.entity';
import { SuppliesModule } from './supplies/supplies.module';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
import { APP_FILTER } from '@nestjs/core';
import { WorkModule } from './work/work.module';
import { Work } from './work/entities/work.entity';
import { SalesModule } from './sales/sales.module';
import { Sale } from './sales/entities/sale.entity';
import { SaleDetails } from './sales/entities/sale-details.entity';

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
      logging: true,
      // dropSchema: true,
      entities: [
        Client,
        Crop,
        Employee,
        Harvest,
        Supplier,
        Supply,
        User,
        HarvestDetails,
        HarvestStock,
        SuppliesPurchase,
        SuppliesPurchaseDetails,
        SuppliesStock,
        SuppliesConsumption,
        SuppliesConsumptionDetails,
        Work,
        Sale,
        SaleDetails,
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
    WorkModule,
    SalesModule,
  ],
})
export class AppModule {}
