import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsDateString,
  IsDefined,
  IsInt,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { HarvestDetailsDto } from './harvest-details.dto';
import { MatchTotals } from 'src/common/decorators/match-totals.decorator';
import { UniqueRecordIdInArray } from 'src/common/decorators/unique-id-in-array.decorator';

export class HarvestDto {
  @IsDateString()
  date: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @IsInt()
  @IsPositive()
  amount: number;

  @IsInt()
  @IsPositive()
  value_pay: number;

  @IsString()
  observation: string;

  @ArrayNotEmpty()
  @MatchTotals({
    fields: ['amount', 'value_pay'],
    nameArrayToCalculate: 'details',
  })
  @UniqueRecordIdInArray('employee')
  @ValidateNested({ each: true })
  @Type(() => HarvestDetailsDto)
  details: HarvestDetailsDto[];
}
