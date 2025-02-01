import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class QueryTotalHarvestsInYearDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(2024)
  year: number;

  @IsOptional()
  @IsUUID(4)
  crop: string;

  @IsOptional()
  @IsUUID(4)
  employee: string;
}
