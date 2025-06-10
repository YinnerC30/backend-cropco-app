import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarvestModule } from 'src/harvest/harvest.module';
import { Sale } from './entities/sale.entity';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { CommonModule } from 'src/common/common.module';
import { UnitConversionModule } from 'src/common/unit-conversion/unit-conversion.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sale]), HarvestModule, CommonModule, UnitConversionModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
