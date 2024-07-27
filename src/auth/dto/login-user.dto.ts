import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'test@gmail.com',
    maxLength: 100,
  })
  @IsEmail()
  email: string;
  @IsString()
  @ApiProperty({
    description: 'Contraseña',
    example: '1234password',
    maxLength: 100,
  })
  password: string;
}
