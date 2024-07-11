import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { SaleDetailsDto } from './sale-details.dto';

export class CreateSaleDto {
  @ApiProperty({
    example: '2023-07-21',
    description: 'Fecha de la venta en formato ISO 8601',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    example: 5,
    description: 'Cantidad de items vendidos',
  })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({
    example: 100,
    description: 'Monto total de la venta',
  })
  @IsInt()
  @IsPositive()
  total: number;

  @ApiProperty({
    example: false,
    description: 'Indica si la venta es a crédito',
  })
  @IsBoolean()
  is_receivable: boolean;

  @ApiProperty({
    type: [SaleDetailsDto],
    description: 'Detalles de los items vendidos',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => SaleDetailsDto)
  details: SaleDetailsDto[];
}
