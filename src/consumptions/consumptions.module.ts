import { Module } from '@nestjs/common';
import { ConsumptionsService } from './consumptions.service';
import { ConsumptionsController } from './consumptions.controller';
import { SuppliesModule } from 'src/supplies/supplies.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliesConsumption } from './entities/supplies-consumption.entity';
import { SuppliesConsumptionDetails } from './entities/supplies-consumption-details.entity';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SuppliesConsumption, SuppliesConsumptionDetails]),
    SuppliesModule,
    CommonModule,
  ],
  controllers: [ConsumptionsController],
  providers: [ConsumptionsService],
  exports: [ConsumptionsService, TypeOrmModule],
})
export class ConsumptionsModule {}
