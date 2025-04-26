import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested
} from 'class-validator';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';
import { Harvest } from '../entities/harvest.entity';

export class HarvestDetailsDto {
  @IsOptional()
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Empleado asociado a los detalles de la cosecha',
    type: () => ValidateUUID,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  employee: DeepPartial<Employee>;

  // @ApiPropertyOptional({
  //   description: 'Cosecha asociada a los detalles (opcional)',
  //   type: () => ValidateUUID,
  //   required: false,
  // })
  // @IsOptional()
  // @ValidateNested()
  // @Type(() => ValidateUUID)
  // harvest: DeepPartial<Harvest>;

  @ApiProperty({
    description: 'Cantidad total asociada a estos detalles',
    example: 100,
    type: Number,
  })
  @IsInt()
  @IsPositive()
  total: number;

  @ApiProperty({
    description: 'Valor de pago asociado a estos detalles',
    example: 500,
    type: Number,
  })
  @IsInt()
  @IsPositive()
  value_pay: number;
}
