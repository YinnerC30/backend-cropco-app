import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  subdomain: string;

  @IsString()
  companyName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;
} 