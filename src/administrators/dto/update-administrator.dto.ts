import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAdministradorDto {
  @IsString()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MaxLength(100)
  last_name: string;

  @IsString()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @MinLength(9)
  @MaxLength(15)
  cell_phone_number: string;

  @IsIn(['admin', 'user', 'manager'])
  role: string;
}
