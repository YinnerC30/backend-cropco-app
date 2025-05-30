import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class QueryTotalSalesInYearDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(2024)
  year: number;

  @IsOptional()
  @IsUUID(4)
  cropId: string;

  @IsOptional()
  @IsUUID(4)
  clientId: string;
}
