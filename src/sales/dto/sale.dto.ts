import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { SaleDetailsDto } from './sale-details.dto';

export class SaleDto {
  @IsDateString()
  date: string;

  @IsInt()
  @IsPositive()
  amount: number;

  @IsInt()
  @IsPositive()
  value_pay: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => SaleDetailsDto)
  details: SaleDetailsDto[];
}
