import { IsEmail, IsNumberString, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Nombre del empleado',
    maxLength: 100,
    example: 'Juan',
  })
  @IsString()
  @MaxLength(100)
  first_name: string;

  @ApiProperty({
    description: 'Apellido del empleado',
    maxLength: 100,
    example: 'Pérez',
  })
  @IsString()
  @MaxLength(100)
  last_name: string;

  @ApiProperty({
    description: 'Correo electrónico del empleado',
    format: 'email',
    maxLength: 100,
    example: 'juan.perez@example.com',
  })
  @IsString()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({
    description: 'Número de teléfono celular del empleado',
    maxLength: 10,
    example: '1234567890',
  })
  @IsNumberString()
  @MaxLength(10)
  cell_phone_number: string;

  @ApiProperty({
    description: 'Dirección del empleado',
    maxLength: 200,
    example: 'Calle Falsa 123, Ciudad, País',
  })
  @IsString()
  @MaxLength(200)
  address: string;
}
