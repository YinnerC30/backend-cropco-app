import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Client } from 'src/clients/entities/client.entity';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { Type } from 'class-transformer';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';

export class SaleDetailsDto {
  @IsUUID(4)
  @IsOptional()
  id: string;

  @ApiProperty({
    example: 5,
    description: 'Cantidad de items en este detalle de venta',
  })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({
    example: 100,
    description: 'Monto total de este detalle de venta',
  })
  @IsInt()
  @IsPositive()
  total: number;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID de la venta asociada (opcional)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  sale: DeepPartial<Sale>;

  @ApiProperty({
    type: ValidateUUID,
    description: 'Información del cultivo asociado a este detalle de venta',
  })
  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @ApiProperty({
    type: ValidateUUID,
    description: 'Información del cliente asociado a este detalle de venta',
  })
  @ValidateNested()
  @Type(() => ValidateUUID)
  client: DeepPartial<Client>;

  @ApiProperty({
    example: false,
    description: 'Indica si la venta es a crédito',
  })
  @IsBoolean()
  is_receivable: boolean;
}
