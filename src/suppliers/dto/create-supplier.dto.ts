import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({
    example: 'John',
    description: 'Nombre del proveedor',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  first_name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Apellido del proveedor',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  last_name: string;

  @ApiProperty({
    example: 'Acme Inc.',
    description: 'Nombre de la empresa del proveedor (opcional)',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company_name?: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Correo electrónico del proveedor',
    maxLength: 100,
  })
  @IsString()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Número de teléfono celular del proveedor',
    maxLength: 10,
  })
  @IsNumberString()
  @MaxLength(10)
  cell_phone_number: string;

  @ApiProperty({
    example: '123 Main St, Anytown, AN 12345',
    description: 'Dirección del proveedor',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  address: string;
}
