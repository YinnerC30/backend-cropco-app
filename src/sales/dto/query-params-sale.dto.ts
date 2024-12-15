import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
} from 'class-validator';
import { QueryParams } from 'src/common/dto/QueryParams';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';

export class QueryParamsSale extends QueryParams {
  @IsOptional()
  @IsBooleanString()
  filter_by_date?: boolean;

  @IsOptional()
  @IsEnum(TypeFilterDate)
  type_filter_date?: TypeFilterDate;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBooleanString()
  filter_by_total?: boolean;

  @IsOptional()
  @IsEnum(TypeFilterNumber)
  type_filter_total?: TypeFilterNumber;

  @IsOptional()
  @Type(() => Number) // Transformará el valor a un número
  @IsInt()
  total?: number;

  @IsOptional()
  @IsBooleanString()
  filter_by_quantity?: boolean;

  @IsOptional()
  @IsEnum(TypeFilterNumber)
  type_filter_quantity?: TypeFilterNumber;

  @IsOptional()
  @Type(() => Number) // Transformará el valor a un número
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsBooleanString()
  filter_by_is_receivable: boolean;

  @IsOptional()
  @IsBooleanString()
  is_receivable: boolean;
}
