import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  subdomain: string;

  @IsString()
  company_name: string;

  @IsEmail()
  email: string;

  @IsString()
  cell_phone_number: string;
}
