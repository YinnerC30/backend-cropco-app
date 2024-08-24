import { IsDateString, IsInt, IsOptional } from 'class-validator';
import { QueryParams } from 'src/common/dto/QueryParams';
import { Type } from 'class-transformer';

export class QueryParamsConsumption extends QueryParams {
  @IsOptional()
  @IsDateString()
  after_date: string;

  @IsOptional()
  @IsDateString()
  before_date: string;
}
