import {
  IsArray,
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { Transform } from 'class-transformer';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';

export class QueryParamsConsumption extends QueryParamsDto {
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
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') {
      return undefined; // Convierte strings vacíos a undefined
    }
    return typeof value === 'string' ? value.split(',') : value; // Convierte strings separados por comas a un array
  })
  @IsUUID('4', { each: true }) // Valida que cada elemento del array sea un UUID v4
  crops?: string[];
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') {
      return undefined; // Convierte strings vacíos a undefined
    }
    return typeof value === 'string' ? value.split(',') : value; // Convierte strings separados por comas a un array
  })
  @IsUUID('4', { each: true }) // Valida que cada elemento del array sea un UUID v4
  supplies?: string[];
}
