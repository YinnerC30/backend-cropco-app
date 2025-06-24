import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsDateString,
  IsNumber,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { ShoppingSuppliesDetailsDto } from './shopping-supplies-details.dto';
import { IsMultipleOf } from 'src/common/decorators/is-multiple-of.decorator';
import { MatchTotals } from 'src/common/decorators/match-totals.decorator';

export class ShoppingSuppliesDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @IsPositive()
  @IsMultipleOf(50, { message: 'The value must be a multiple of 50' })
  value_pay: number;

  @ArrayNotEmpty()
  @MatchTotals({
    fields: ['value_pay'],
    nameArrayToCalculate: 'details',
  })
  @ValidateNested({ each: true })
  @Type(() => ShoppingSuppliesDetailsDto)
  details: ShoppingSuppliesDetailsDto[];
}
