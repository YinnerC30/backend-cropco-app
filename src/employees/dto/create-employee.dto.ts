import { IsEmail, IsNumberString, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Nombre del empleado',
    maxLength: 100,
    example: 'Juan',
    type: String,
  })
  @IsString()
  @MaxLength(100)
  first_name: string;

  @ApiProperty({
    description: 'Apellido del empleado',
    maxLength: 100,
    example: 'Pérez',
    type: String,
  })
  @IsString()
  @MaxLength(100)
  last_name: string;

  @ApiProperty({
    description: 'Correo electrónico del empleado',
    format: 'email',
    maxLength: 100,
    example: 'juan.perez@example.com',
    type: String,
    uniqueItems: true,
  })
  @IsString()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({
    description: 'Número de teléfono celular del empleado',
    maxLength: 10,
    example: '3123456789',
    type: String,
  })
  @IsNumberString()
  @MaxLength(10)
  cell_phone_number: string;

  @ApiProperty({
    description: 'Dirección del empleado',
    maxLength: 200,
    example: 'Calle Falsa 123, Ciudad, País',
    type: String,
  })
  @IsString()
  @MaxLength(200)
  address: string;
}
