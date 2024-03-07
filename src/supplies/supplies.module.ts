import { Module } from '@nestjs/common';
import { SuppliesService } from './supplies.service';
import { SuppliesController } from './supplies.controller';
import { Supply } from './entities/supply.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliesPurchase } from './entities/supplies-purchase.entity';
import { SuppliesPurchaseDetails } from './entities/supplies-purchase-details.entity';
import { SuppliesStock } from './entities/supplies-stock.entity';
import { SuppliesConsumption } from './entities/supplies-consumption.entity';
import { SuppliesConsumptionDetails } from './entities/supplies-consumption-details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supply,
      SuppliesPurchase,
      SuppliesPurchaseDetails,
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
