import { IsDateString, IsInt, IsOptional } from 'class-validator';
import { QueryParams } from 'src/common/dto/QueryParams';
import { Type } from 'class-transformer';

export class QueryParamsShopping extends QueryParams {
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
}
