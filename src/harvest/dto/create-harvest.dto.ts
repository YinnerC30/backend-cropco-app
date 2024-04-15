import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsDateString,
  IsInt,
  IsPositive,
  IsString,
  ValidateNested
} from 'class-validator';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { HarvestDetailsDto } from './create-harvest-details.dto';

export class CreateHarvestDto {
  @IsDateString()
  date: string;

  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @IsInt()
  @IsPositive()
  total: number;

  @IsInt()
  @IsPositive()
  value_pay: number;

  @IsString()
  observation: string;

  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => HarvestDetailsDto)
  details: HarvestDetailsDto[];
}
