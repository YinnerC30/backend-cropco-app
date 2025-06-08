import { Module } from '@nestjs/common';
import { ConsumptionsService } from './consumptions.service';
import { ConsumptionsController } from './consumptions.controller';
import { SuppliesModule } from 'src/supplies/supplies.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliesConsumption } from './entities/supplies-consumption.entity';
import { SuppliesConsumptionDetails } from './entities/supplies-consumption-details.entity';
import { CommonModule } from 'src/common/common.module';
import { UnitConversionModule } from 'src/common/unit-conversion/unit-conversion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SuppliesConsumption, SuppliesConsumptionDetails]),
    SuppliesModule,
    CommonModule,
    UnitConversionModule,
  ],
  controllers: [ConsumptionsController],
  providers: [ConsumptionsService],
  exports: [ConsumptionsService, TypeOrmModule],
})
export class ConsumptionsModule {}
