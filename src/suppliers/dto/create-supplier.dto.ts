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
  @MinLength(2)
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  last_name: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
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
  @MinLength(6)
  @MaxLength(200)
  address: string;
}
