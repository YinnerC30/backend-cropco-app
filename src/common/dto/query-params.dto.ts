import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class QueryParamsDto {
  @ApiPropertyOptional({
    default: 10,
    description: 'Número de registros que se obtendrán',
    example: 10,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(10)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    default: 0,
    description: 'Número de registros que hay que desplazarse',
    example: 0,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({
    description: 'Indicador para obtener todos los registros',
    example: true,
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  all_records?: boolean;

  @ApiProperty({
    description: 'Cadena de búsqueda',
    example: 'keyword',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  query?: string;
}
