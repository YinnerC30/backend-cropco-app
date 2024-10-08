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
  @ApiProperty({
    description: 'Nombre del usuario',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  first_name: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  last_name: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    format: 'email',
    maxLength: 100,
  })
  @IsString()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  password: string;

  @ApiProperty({
    description: 'Número de teléfono celular del usuario',
    maxLength: 10,
  })
  @IsString()
  @MaxLength(10)
  cell_phone_number: string;

  @IsArray()
  @ValidateNested()
  @Type(() => UserActionDto)
  actions: UserActionDto[];
}
