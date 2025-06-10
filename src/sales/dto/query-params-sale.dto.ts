import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { MassUnit } from 'src/common/unit-conversion/unit-conversion.service';

export class QueryParamsSale extends QueryParamsDto {
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
  @Type(() => Number) // Transformará el valor a un número
  @IsInt()
  value_pay?: number;

  @IsOptional()
  @IsBooleanString()
  filter_by_amount?: boolean;

  @IsOptional()
  @IsEnum(TypeFilterNumber)
  type_filter_amount?: TypeFilterNumber;

  @IsOptional()
  @IsString()
  @IsIn([
    // Unidades de masa
    'GRAMOS',
    'KILOGRAMOS',
    'LIBRAS',
    'ONZAS',
    'TONELADAS',
  ])
  type_unit_of_measure: MassUnit;

  @IsOptional()
  @Type(() => Number) // Transformará el valor a un número
  @IsInt()
  amount?: number;

  @IsOptional()
  @IsBooleanString()
  filter_by_is_receivable: boolean;

  @IsOptional()
  @IsBooleanString()
  is_receivable: boolean;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') {
      return undefined; // Convierte strings vacíos a undefined
    }
    return typeof value === 'string' ? value.split(',') : value; // Convierte strings separados por comas a un array
  })
  @IsUUID('4', { each: true }) // Valida que cada elemento del array sea un UUID v4
  clients?: string[];
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') {
      return undefined; // Convierte strings vacíos a undefined
    }
    return typeof value === 'string' ? value.split(',') : value; // Convierte strings separados por comas a un array
  })
  @IsUUID('4', { each: true }) // Valida que cada elemento del array sea un UUID v4
  crops?: string[];
}
