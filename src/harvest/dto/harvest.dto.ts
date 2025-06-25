import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsDateString,
  IsDefined,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

import { MatchAmount } from 'src/common/decorators/match-amount.decorator';
import { MatchTotals } from 'src/common/decorators/match-totals.decorator';
import { UniqueRecordIdInArray } from 'src/common/decorators/unique-id-in-array.decorator';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { HarvestDetailsDto } from './harvest-details.dto';

export class HarvestDto {
  @IsDateString()
  date: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

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

  @IsString()
  observation: string;

  @ArrayNotEmpty()
  @UniqueRecordIdInArray('employee')
  @ValidateNested({ each: true })
  @Type(() => HarvestDetailsDto)
  details: HarvestDetailsDto[];
}
