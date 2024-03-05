import {
  IsDateString,
  IsIn,
  IsInt,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { UnitOfMeasure } from '../entities/harvest.entity';

export class CreateHarvestDto {
  @IsDateString()
  date: string;

  @IsUUID()
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
}
