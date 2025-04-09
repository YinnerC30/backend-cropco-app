import { IsOptional, IsUUID } from 'class-validator';
import { QueryForYearDto } from 'src/common/dto/query-for-year.dto';

export class QueryTotalWorksInYearDto extends QueryForYearDto {
  @IsOptional()
  @IsUUID(4)
  cropId: string;

  @IsOptional()
  @IsUUID(4)
  employeeId: string;
}
