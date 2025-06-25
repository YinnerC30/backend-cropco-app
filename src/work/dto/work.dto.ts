import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNumber,
  IsPositive,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { WorkDetailsDto } from './work-details.dto';
import { MatchTotals } from 'src/common/decorators/match-totals.decorator';

export class WorkDto {
  @IsDateString()
  date: string;

  @IsString()
  @Length(10, 500)
  description: string;

  @IsNumber()
  @IsPositive()
  @MatchTotals({
    fields: ['value_pay'],
    nameArrayToCalculate: 'details',
  })
  value_pay: number;

  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => WorkDetailsDto)
  details: WorkDetailsDto[];
}
