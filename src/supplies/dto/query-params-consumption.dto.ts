import {
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
} from 'class-validator';
import { QueryParams } from 'src/common/dto/QueryParams';
import { Type } from 'class-transformer';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';

export class QueryParamsConsumption extends QueryParams {
  @IsOptional()
  @IsBooleanString()
  filter_by_date?: boolean;

  @IsOptional()
  @IsEnum(TypeFilterDate)
  type_filter_date?: TypeFilterDate;

  @IsOptional()
  @IsDateString()
  date?: string;
}
