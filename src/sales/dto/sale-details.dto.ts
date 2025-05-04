import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Client } from 'src/clients/entities/client.entity';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';

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
  amount: number;

  @ApiProperty({
    example: 100,
    description: 'Monto total de este detalle de venta',
  })
  @IsInt()
  @IsPositive()
  value_pay: number;

  @ApiProperty({
    type: ValidateUUID,
    description: 'Información del cultivo asociado a este detalle de venta',
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @ApiProperty({
    type: ValidateUUID,
    description: 'Información del cliente asociado a este detalle de venta',
  })
  @IsDefined()
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
