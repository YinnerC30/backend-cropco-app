import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supply } from './entities';
import { SuppliesStock } from './entities/supplies-stock.entity';
import { SuppliesService } from './supplies.service';
import { SuppliesController } from './supplies.controller';
import { UnitConversionModule } from 'src/common/unit-conversion/unit-conversion.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supply, SuppliesStock]),
    UnitConversionModule,
    CommonModule,
  ],
  controllers: [SuppliesController],
  providers: [SuppliesService],
  exports: [SuppliesService,TypeOrmModule],
})
export class SuppliesModule {}
