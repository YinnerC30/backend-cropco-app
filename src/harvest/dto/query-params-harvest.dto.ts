import { Transform, Type } from 'class-transformer';
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
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';

export class QueryParamsHarvest extends QueryParamsDto {
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
  filter_by_value_pay?: boolean;

  @IsOptional()
  @IsEnum(TypeFilterNumber)
  type_filter_value_pay?: TypeFilterNumber;

  @IsOptional()
  @Type(() => Number) // Transformará el valor a un número
  @IsInt()
  value_pay?: number;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') {
      return undefined; // Convierte strings vacíos a undefined
    }
    return typeof value === 'string' ? value.split(',') : value; // Convierte strings separados por comas a un array
  })
  @IsUUID('4', { each: true }) // Valida que cada elemento del array sea un UUID v4
  employees?: string[];
}
