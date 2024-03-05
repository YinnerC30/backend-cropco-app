import {
  ArrayNotEmpty,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { UnitOfMeasure } from '../entities/harvest.entity';
import { HarvestDetailsDto } from './create-harvest-details.dto';
import { Type } from 'class-transformer';

export class CreateHarvestDto {
  @IsDateString()
  date: string;

  @IsUUID()
  cropId: string;

  @IsString()
  @IsIn(['KILOGRAMOS', 'LIBRAS'])
  unit_of_measure: UnitOfMeasure;

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
  harvest_details: HarvestDetailsDto[];
}
