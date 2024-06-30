import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';
import { Work } from '../entities/work.entity';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';
import { Type } from 'class-transformer';

export class WorkDetailsDto {
  @ValidateNested()
  @Type(() => ValidateUUID)
  employee: Employee;

  @IsInt()
  @IsPositive()
  value_pay: number;

  @IsBoolean()
  payment_is_pending: boolean;

  @IsOptional()
  @IsUUID()
  work: DeepPartial<Work>;
}
