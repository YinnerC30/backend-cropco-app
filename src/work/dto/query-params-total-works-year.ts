import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { QueryForYearDto } from 'src/common/dto/query-for-year.dto';

export class QueryTotalWorksInYearDto extends QueryForYearDto {
  @IsOptional()
  @IsUUID(4)
  crop: string;

  @IsOptional()
  @IsUUID(4)
  employee: string;
}
