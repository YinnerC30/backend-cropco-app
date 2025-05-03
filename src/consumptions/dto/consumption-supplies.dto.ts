import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConsumptionSuppliesDetailsDto } from './consumption-supplies-details.dto';

export class ConsumptionSuppliesDto {
  @IsDateString()
  date: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => ConsumptionSuppliesDetailsDto)
  details: ConsumptionSuppliesDetailsDto[];
}
