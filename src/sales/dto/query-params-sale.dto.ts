import { IsBoolean, IsDateString, IsInt, IsOptional } from 'class-validator';
import { QueryParams } from 'src/common/dto/QueryParams';
import { Transform, Type } from 'class-transformer';

export class QueryParamsSale extends QueryParams {
  @IsOptional()
  @IsDateString()
  after_date: string;

  @IsOptional()
  @IsDateString()
  before_date: string;

  @IsOptional()
  @Type(() => Number) // Transformará el valor a un número
  @IsInt()
  minor_total: number;

  @IsOptional()
  @Type(() => Number) // Transformará el valor a un número
  @IsInt()
  major_total: number;

  @IsOptional()
  @Type(() => Number) // Transformará el valor a un número
  @IsInt()
  minor_quantity: number;

  @IsOptional()
  @Type(() => Number) // Transformará el valor a un número
  @IsInt()
  major_quantity: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  filter_by_is_receivable: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  is_receivable: boolean;
}
