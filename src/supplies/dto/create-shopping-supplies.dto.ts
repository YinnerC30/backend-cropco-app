import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { ShoppingSuppliesDetailsDto } from './shopping-supplies-details.dto';
import { Type } from 'class-transformer';

export class CreateShoppingSuppliesDto {
  @IsDateString()
  date: string;
  @IsInt()
  @IsPositive()
  total: number;

  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ShoppingSuppliesDetailsDto)
  details: ShoppingSuppliesDetailsDto[];
}
