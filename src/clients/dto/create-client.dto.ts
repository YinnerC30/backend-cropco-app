import { IsEmail, IsNumberString, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsColombianPhone } from 'src/common/decorators/is-colombian-phone.decorator';

export class CreateClientDto {
  @ApiProperty({
    description: 'Nombre del cliente',
    example: 'Juan',
    maxLength: 100,
    type: String,
  })
  @IsString()
  @MaxLength(100)
  first_name: string;

  @ApiProperty({
    description: 'Apellido del cliente',
    example: 'Pérez',
    maxLength: 100,
    type: String,
  })
  @IsString()
  @MaxLength(100)
  last_name: string;

  @ApiProperty({
    description: 'Correo electrónico del cliente',
    example: 'juan.perez@example.com',
    maxLength: 100,
    type: String,
  })
  @IsString()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({
    description: 'Número de teléfono celular del cliente',
    example: '3146574352',
    maxLength: 10,
    type: String,
  })
  @IsNumberString()
  @MaxLength(10)
  @IsColombianPhone({ message: 'El número de celular debe ser válido para Colombia.' })
  cell_phone_number: string;

  @ApiProperty({
    description: 'Dirección del cliente',
    example: 'Calle Falsa 123, Ciudad, País',
    maxLength: 200,
    type: String,
  })
  @IsString()
  @MaxLength(200)
  address: string;
}
