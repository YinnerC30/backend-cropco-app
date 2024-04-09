import { IsOptional, IsString, MinLength } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class Search extends PaginationDto {
  @IsOptional()
  @IsString()
  parameter: string;
}
