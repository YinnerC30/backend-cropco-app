import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { UserActionDto } from './user-action.dto';
import { RoleUser } from '../types/role-user.type';

export class UserDto {
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
  @ValidateNested()
  @Type(() => UserActionDto)
  actions: UserActionDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['admin', 'user'], { each: true })
  roles?: RoleUser[];
}
