import { IsEmail, IsIn, IsString, MaxLength } from 'class-validator';

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
  @MaxLength(10)
  cell_phone_number: string;

  @IsIn(['admin', 'user', 'manager'])
  role: string;
}
