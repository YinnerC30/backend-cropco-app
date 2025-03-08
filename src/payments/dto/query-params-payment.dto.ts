import {
  IsBoolean,
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
} from 'class-validator';
import { QueryParams } from 'src/common/dto/query-params';
import { Transform, Type } from 'class-transformer';
import { MethodOfPayment } from '../entities/payment.entity';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';

export class QueryParamsPayment extends QueryParams {
  @IsOptional()
  employee?: string;

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
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  filter_by_method_of_payment: boolean;

  @IsOptional()
  @IsIn(['EFECTIVO', 'TRANSFERENCIA', 'INTERCAMBIO'])
  method_of_payment: MethodOfPayment;

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
}
