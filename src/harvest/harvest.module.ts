import { Module } from '@nestjs/common';
import { HarvestService } from './harvest.service';
import { HarvestController } from './harvest.controller';
import { DatabaseModule } from 'src/database/database.module';
import { harvestProviders } from './harvest.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [HarvestController],
  providers: [...harvestProviders, HarvestService],
})
export class HarvestModule {}
