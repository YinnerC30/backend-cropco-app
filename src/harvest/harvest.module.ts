import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarvestDetails } from './entities/harvest-details.entity';
import { HarvestProcessed } from './entities/harvest-processed.entity';
import { HarvestStock } from './entities/harvest-stock.entity';
import { Harvest } from './entities/harvest.entity';
import { HarvestController } from './harvest.controller';
import { HarvestService } from './harvest.service';
import { CommonModule } from 'src/common/common.module';
import { UnitConversionModule } from 'src/common/unit-conversion/unit-conversion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Harvest,
      HarvestDetails,
      HarvestStock,
      HarvestProcessed,
    ]),
    CommonModule,
    UnitConversionModule,
  ],
  controllers: [HarvestController],
  providers: [HarvestService],
  exports: [TypeOrmModule, HarvestService],
})
export class HarvestModule {}
