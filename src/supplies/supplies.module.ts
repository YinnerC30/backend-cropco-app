import { Module } from '@nestjs/common';
import { SuppliesService } from './supplies.service';
import { SuppliesController } from './supplies.controller';
import { DatabaseModule } from 'src/database/database.module';
import { supplyProviders } from './supplies.providers';

@Module({
  controllers: [SuppliesController],
  providers: [...supplyProviders, SuppliesService],
  imports: [DatabaseModule],
  exports: [SuppliesService],
})
export class SuppliesModule {}
