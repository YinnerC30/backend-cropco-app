import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';
import { Harvest } from '../entities/harvest.entity';

export class HarvestDetailsDto {
  @ValidateNested()
  @Type(() => ValidateUUID)
  employee: DeepPartial<Employee>;

  @IsOptional()
  @ValidateNested()
  @Type(() => ValidateUUID)
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
