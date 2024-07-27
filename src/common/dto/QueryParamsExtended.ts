import { IsDateString, IsInt, IsOptional, IsPositive } from 'class-validator';
import { QueryParams } from './QueryParams';
import { Type } from 'class-transformer';

export class QueryParamsExtended extends QueryParams {

  @IsOptional()
  @IsDateString()
  date_of_creation?: string;
  
  @IsOptional()
  @IsDateString()
  date_of_termination?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  units?: number;
}
