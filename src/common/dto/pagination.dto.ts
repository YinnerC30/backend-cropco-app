import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number) // enableImplicitConversions: true
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number) // enableImplicitConversions: true
  offset?: number;
}
