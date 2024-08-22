import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
} from 'class-validator';
import { QueryParams } from 'src/common/dto/QueryParams';
import { Transform, Type } from 'class-transformer';
import { MethodOfPayment } from '../entities/payment.entity';

export class QueryParamsPayment extends QueryParams {
  @IsOptional()
  employee?: string;

  @IsOptional()
  @IsDateString()
  after_date: string;

  @IsOptional()
  @IsDateString()
  before_date: string;

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
  @Type(() => Number) // Transformará el valor a un número
  @IsInt()
  minor_total: number;

  @IsOptional()
  @Type(() => Number) // Transformará el valor a un número
  @IsInt()
  major_total: number;
}
