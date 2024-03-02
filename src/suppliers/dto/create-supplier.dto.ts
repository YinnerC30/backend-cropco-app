import {
  IsString,
  MaxLength,
  IsEmail,
  IsNumberString,
  IsOptional,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MaxLength(100)
  last_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  company_name?: string;

  @IsString()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsNumberString()
  @MaxLength(10)
  cell_phone_number: string;

  @IsString()
  @MaxLength(200)
  address: string;
}
