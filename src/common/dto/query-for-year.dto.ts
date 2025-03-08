import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class QueryForYearDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(2024)
  year: number;
}
