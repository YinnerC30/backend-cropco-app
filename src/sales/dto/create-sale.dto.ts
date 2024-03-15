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

export class CreateSaleDto {
  @IsDateString()
  date: string;
  @IsInt()
  @IsPositive()
  quantity: number;
  @IsInt()
  @IsPositive()
  total: number;
  @IsBoolean()
  is_receivable: boolean;
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => SaleDetailsDto)
  details: SaleDetailsDto[];
}
