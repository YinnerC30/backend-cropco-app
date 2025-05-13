import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';

import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { Harvest } from '../entities/harvest.entity';

export class HarvestProcessedDto {
  @IsDateString()
  date: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  harvest: DeepPartial<Harvest>;

  @IsInt()
  @IsPositive()
  amount: number;
}
