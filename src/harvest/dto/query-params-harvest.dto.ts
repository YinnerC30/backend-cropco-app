import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { UUID } from 'node:crypto';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { MassUnit } from 'src/common/unit-conversion/unit-conversion.service';

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
  filter_by_amount?: boolean;

  @IsOptional()
  @IsEnum(TypeFilterNumber)
  type_filter_amount?: TypeFilterNumber;

  @IsString()
  @IsOptional()
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
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsBooleanString()
  filter_by_value_pay?: boolean;

  @IsOptional()
  @IsEnum(TypeFilterNumber)
  type_filter_value_pay?: TypeFilterNumber;

 @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsPositive()
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
  employees?: UUID[];
}
