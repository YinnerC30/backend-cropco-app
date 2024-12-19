import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserActionDto } from './user-action.dto';
import { Type } from 'class-transformer';

export class CreateUserDto {
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
  @MaxLength(100)
  password: string;

  @IsString()
  @MaxLength(10)
  cell_phone_number: string;

  @IsArray()
  @ValidateNested()
  @Type(() => UserActionDto)
  actions: UserActionDto[];
}
