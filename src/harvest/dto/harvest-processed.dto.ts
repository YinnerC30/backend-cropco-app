import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsIn,
  IsNumber,
  IsNotEmpty,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { Harvest } from '../entities/harvest.entity';
import {
  MassUnit,
  UnitType,
} from 'src/common/unit-conversion/unit-conversion.service';

export class HarvestProcessedDto {
  @IsDateString()
  date: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  // @IsDefined()
  // @ValidateNested()
  // @Type(() => ValidateUUID)
  // harvest: DeepPartial<Harvest>;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    // Unidades de masa
    'GRAMOS',
    'KILOGRAMOS',
    'LIBRAS',
    'ONZAS',
    'TONELADAS',
  ])
  unit_of_measure: MassUnit;

  @IsNumber()
  @IsPositive()
  amount: number;
}
