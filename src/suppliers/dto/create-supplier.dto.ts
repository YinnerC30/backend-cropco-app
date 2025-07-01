import {
  IsEmail,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MinLength(1)
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
  @MinLength(9)
  @MaxLength(15)
  cell_phone_number: string;

  @IsString()
  @MaxLength(200)
  address: string;
}
