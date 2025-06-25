import {
  IsArray,
  IsEmail,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RoleUser } from 'src/users/types/role-user.type';

export class UserTenantDto {
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
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @IsString()
  @MaxLength(15)
  @MinLength(9)
  cell_phone_number: string;

  @IsArray()
  @IsString({ each: true })
  @IsIn(['admin', 'user'], { each: true })
  roles?: RoleUser[];
}
