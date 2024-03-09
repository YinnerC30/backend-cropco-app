import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliesConsumptionDetails } from './entities/supplies-consumption-details.entity';
import { SuppliesConsumption } from './entities/supplies-consumption.entity';
import { SuppliesPurchaseDetails } from './entities/supplies-purchase-details.entity';
import { SuppliesPurchase } from './entities/supplies-purchase.entity';
import { SuppliesStock } from './entities/supplies-stock.entity';
import { Supply } from './entities/supply.entity';
import { SuppliesController } from './supplies.controller';
import { SuppliesService } from './supplies.service';

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
