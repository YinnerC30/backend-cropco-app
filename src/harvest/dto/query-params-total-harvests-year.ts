import { IsOptional, IsUUID } from 'class-validator';
import { UUID } from 'node:crypto';
import { QueryForYearDto } from 'src/common/dto/query-for-year.dto';

export class QueryParamsTotalHarvestsInYearDto extends QueryForYearDto {
  @IsOptional()
  @IsUUID(4)
  crop: UUID;

  @IsOptional()
  @IsUUID(4)
  employee: UUID;
}
