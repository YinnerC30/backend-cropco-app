import {
  IsArray,
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { Transform, Type } from 'class-transformer';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';

export class QueryParamsWork extends QueryParamsDto {
  @IsOptional()
  @IsString()
  crop?: string;

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
  filter_by_value_pay?: boolean;

  @IsOptional()
  @IsEnum(TypeFilterNumber)
  type_filter_value_pay?: TypeFilterNumber;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  value_pay?: number;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') {
      return undefined;
    }
    return typeof value === 'string' ? value.split(',') : value;
  })
  @IsUUID('4', { each: true })
  employees?: string[];
}
