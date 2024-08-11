import { IsOptional, IsString } from 'class-validator';

export class QueryClientParams {
  @IsOptional()
  @IsString()
  first_name: string;
}
