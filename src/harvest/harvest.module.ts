import { Module } from '@nestjs/common';
import { HarvestService } from './harvest.service';
import { HarvestController } from './harvest.controller';
import { Harvest } from './entities/harvest.entity';
import { HarvestDetails } from './entities/harvest-details.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarvestStock } from './entities/harvest-stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Harvest, HarvestDetails, HarvestStock])],
  controllers: [HarvestController],
  providers: [HarvestService],
  exports: [TypeOrmModule, HarvestService],
})
export class HarvestModule {}
