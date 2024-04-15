import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsPositive,
  ValidateNested
} from 'class-validator';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { Harvest } from '../entities/harvest.entity';

export class CreateHarvestProcessedDto {
  @IsDateString()
  date: string;

  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @ValidateNested()
  @Type(() => ValidateUUID)
  harvest: DeepPartial<Harvest>;

  @IsInt()
  @IsPositive()
  total: number;
}
