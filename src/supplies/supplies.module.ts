import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliesConsumptionDetails } from './entities/supplies-consumption-details.entity';
import { SuppliesConsumption } from './entities/supplies-consumption.entity';
import { SuppliesShoppingDetails } from './entities/supplies-shopping-details.entity';
import { SuppliesShopping } from './entities/supplies-shopping.entity';
import { SuppliesStock } from './entities/supplies-stock.entity';
import { Supply } from './entities/supply.entity';
import { SuppliesController } from './supplies.controller';
import { SuppliesService } from './supplies.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supply,
      SuppliesShopping,
      SuppliesShoppingDetails,
      SuppliesStock,
      SuppliesConsumption,
      SuppliesConsumptionDetails,
    ]),
  ],
  controllers: [SuppliesController],
  providers: [SuppliesService],
  exports: [SuppliesService, TypeOrmModule],
})
export class SuppliesModule {}
