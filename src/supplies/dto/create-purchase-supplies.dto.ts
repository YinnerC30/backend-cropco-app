import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { PurchaseSuppliesDetailsDto } from './purchase-supplies-details.dto';
import { Type } from 'class-transformer';

export class CreatePurchaseSuppliesDto {
  @IsDateString()
  date: string;
  @IsInt()
  @IsPositive()
  total: number;

  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PurchaseSuppliesDetailsDto)
  details: PurchaseSuppliesDetailsDto[];
}
