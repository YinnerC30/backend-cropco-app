import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';


import { SuppliesShoppingDetails } from './entities/supplies-shopping-details.entity';
import { SuppliesShopping } from './entities/supplies-shopping.entity';

import { SuppliesStock } from './entities';
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
    ]),
  ],
  controllers: [SuppliesController],
  providers: [SuppliesService],
  exports: [SuppliesService, TypeOrmModule],
})
export class SuppliesModule {}
