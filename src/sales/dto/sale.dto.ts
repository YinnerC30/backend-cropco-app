import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { SaleDetailsDto } from './sale-details.dto';
import { MatchAmount } from 'src/common/decorators/match-amount.decorator';
import { MatchTotals } from 'src/common/decorators/match-totals.decorator';

export class SaleDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @IsPositive()
  @MatchAmount({
    nameArrayToCalculate: 'details',
    targetUnit: 'GRAMOS',
  })
  amount: number;

  @IsNumber()
  @IsPositive()
  @MatchTotals({
    fields: ['value_pay'],
    nameArrayToCalculate: 'details',
  })
  value_pay: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => SaleDetailsDto)
  details: SaleDetailsDto[];
}
