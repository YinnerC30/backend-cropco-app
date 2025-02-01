import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class QueryTotalWorksInYearDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(2025)
  year: number;

  @IsOptional()
  @IsUUID(4)
  crop: string;
}
