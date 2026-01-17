import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class UpdateTenantDatabaseDto {
  @IsString()
  @IsNotEmpty()
  database_name: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @IsNotEmpty()
  port: number;
}
