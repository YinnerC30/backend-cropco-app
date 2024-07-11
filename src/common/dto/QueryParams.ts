import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class QueryParams {
  @ApiProperty({
    default: 10,
    description: 'Número de registros que se obtendrán',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  limit?: number;

  @ApiProperty({
    default: 0,
    description: 'Número de registros que hay que desplazarse',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @ApiProperty({
    description: 'Indicador para obtener todos los registros',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  allRecords?: boolean;

  @ApiProperty({
    description: 'Cadena de búsqueda',
    example: 'keyword',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
