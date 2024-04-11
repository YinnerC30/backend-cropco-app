import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsDateString,
  IsIn,
  IsInt,
  IsPositive,
  IsString,
  ValidateNested
} from 'class-validator';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { UnitOfMeasure } from '../entities/harvest.entity';
import { HarvestDetailsDto } from './create-harvest-details.dto';

export class CreateHarvestDto {
  @IsDateString()
  date: string;

  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

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
  details: HarvestDetailsDto[];
}
