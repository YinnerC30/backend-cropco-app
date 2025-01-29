import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class QueryTopEmployeesInHarvestDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(2024)
  year: number;
}
