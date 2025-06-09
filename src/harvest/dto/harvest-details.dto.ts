import { Type } from 'class-transformer';
import {
  IsNumber,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import {
  MassUnit,
  UnitType,
} from 'src/common/unit-conversion/unit-conversion.service';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';

export class HarvestDetailsDto {
  @IsOptional()
  @IsUUID()
  id: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  employee: DeepPartial<Employee>;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    // Unidades de masa
    'GRAMOS',
    'KILOGRAMOS',
    'LIBRAS',
    'ONZAS',
    'TONELADAS',
  ])
  unit_of_measure: MassUnit;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsInt()
  @IsPositive()
  value_pay: number;
}
