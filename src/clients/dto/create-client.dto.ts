import { IsEmail, IsNumberString, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({
    description: 'Nombre del cliente',
    example: 'Juan',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  first_name: string;

  @ApiProperty({
    description: 'Apellido del cliente',
    example: 'Pérez',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  last_name: string;

  @ApiProperty({
    description: 'Correo electrónico del cliente',
    format: 'email',
    example: 'juan.perez@example.com',
    maxLength: 100,
  })
  @IsString()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({
    description: 'Número de teléfono celular del cliente',
    example: '1234567890',
    maxLength: 10,
  })
  @IsNumberString()
  @MaxLength(10)
  cell_phone_number: string;

  @ApiProperty({
    description: 'Dirección del cliente',
    example: 'Calle Falsa 123, Ciudad, País',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  address: string;
}
