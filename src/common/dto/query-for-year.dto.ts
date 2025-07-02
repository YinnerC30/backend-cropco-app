import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export const MIN_YEAR = new Date().getFullYear() - 1;

export class QueryForYearDto {
  @IsOptional()
  // @IsNumber()
  // @Type(() => Number)
  // @Min(MIN_YEAR)
  year: number;
}
