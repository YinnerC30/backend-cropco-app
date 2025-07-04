import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTenantAdministradorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  last_name: string;

  @IsString()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @IsString()
  @MaxLength(15)
  @MinLength(9)
  cell_phone_number: string;

  @IsIn(['admin', 'user', 'manager'])
  role: string;
}
