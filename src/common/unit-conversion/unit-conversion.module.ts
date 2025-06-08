import { Module } from '@nestjs/common';
import { UnitConversionService } from './unit-conversion.service';

@Module({
  providers: [UnitConversionService],
  exports: [UnitConversionService],
})
export class UnitConversionModule {} 