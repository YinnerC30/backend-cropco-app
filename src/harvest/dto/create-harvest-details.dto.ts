import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';
import { Harvest } from '../entities/harvest.entity';

export class HarvestDetailsDto {
  @ApiProperty({
    description: 'Empleado asociado a los detalles de la cosecha',
    type: ValidateUUID,
  })
  @ValidateNested()
  @Type(() => ValidateUUID)
  employee: DeepPartial<Employee>;

  @ApiProperty({
    description: 'Cosecha asociada a los detalles (opcional)',
    type: ValidateUUID,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidateUUID)
  harvest: DeepPartial<Harvest>;

  @ApiProperty({
    description: 'Cantidad total asociada a estos detalles',
    example: 100,
  })
  @IsInt()
  @IsPositive()
  total: number;

  @ApiProperty({
    description: 'Valor de pago asociado a estos detalles',
    example: 500,
  })
  @IsInt()
  @IsPositive()
  value_pay: number;

  @ApiProperty({
    description: 'Indica si el pago está pendiente para estos detalles',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  payment_is_pending: boolean;
}
