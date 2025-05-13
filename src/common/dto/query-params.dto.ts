import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class QueryParamsDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(10)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  all_records?: boolean;

  @IsOptional()
  @IsString()
  query?: string;
}
