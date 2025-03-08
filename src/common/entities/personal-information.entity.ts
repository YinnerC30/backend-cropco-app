import { ApiProperty } from '@nestjs/swagger';
import { Column } from 'typeorm';

export class PersonalInformation {
  @ApiProperty({
    description: 'Nombre de la persona',
    example: 'John',
    maxLength: 100,
    type: String,
  })
  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  first_name: string;

  @ApiProperty({
    description: 'Apellido de la persona',
    example: 'Doe',
    maxLength: 100,
    type: String,
  })
  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  last_name: string;

  @ApiProperty({
    description: 'Correo electrónico de la persona',
    example: 'john.doe@example.com',
    maxLength: 100,
    uniqueItems: true,
    type: String,
  })
  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @ApiProperty({
    description: 'Número de teléfono celular de la persona',
    example: '3146574532',
    maxLength: 10,
    type: String,
  })
  @Column({ type: 'varchar', length: 10, name: 'cell_phone_number' })
  cell_phone_number: string;
}
