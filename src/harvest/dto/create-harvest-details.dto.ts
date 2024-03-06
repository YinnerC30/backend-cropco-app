import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';
import { Harvest } from '../entities/harvest.entity';
export class HarvestDetailsDto {
  @IsUUID()
  employee: DeepPartial<Employee>;

  @IsOptional()
  @IsUUID()
  harvest: DeepPartial<Harvest>;

  @IsInt()
  @IsPositive()
  total: number;

  @IsInt()
  @IsPositive()
  value_pay: number;

  @IsOptional()
  @IsBoolean()
  payment_is_pending: boolean;
}
