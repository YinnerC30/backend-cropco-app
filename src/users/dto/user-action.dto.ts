import { IsOptional, IsUUID } from 'class-validator';

export class UserActionDto {
  @IsOptional()
  @IsUUID()
  id: string;
}
