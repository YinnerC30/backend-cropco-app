import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateCropDto {
  @ApiProperty({
    description: 'Nombre del cultivo',
    example: 'Maíz',
    minLength: 4,
    maxLength: 100,
    type: String,
  })
  @IsString()
  @Length(4, 100)
  name: string;

  @ApiProperty({
    description: 'Descripción del cultivo',
    example: 'Este es un cultivo de maíz.',
    maxLength: 500,
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description: string;

  @ApiProperty({
    description: 'Cantidad de unidades del cultivo',
    example: 10,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  units: number;

  @ApiProperty({
    description: 'Ubicación del cultivo',
    example: 'Parcela 4, Sector A',
    minLength: 4,
    maxLength: 150,
    type: String,
  })
  @IsString()
  @Length(4, 150)
  location: string;

  @ApiProperty({
    description: 'Fecha de creación del cultivo',
    example: '2023-07-01',
    format: 'date',
    type: String,
  })
  @IsDateString()
  date_of_creation: string;

  @ApiProperty({
    description: 'Fecha de terminación del cultivo',
    example: '2023-10-01',
    format: 'date',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsDateString()
  date_of_termination: string;
}
