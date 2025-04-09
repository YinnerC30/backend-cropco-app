import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Type } from 'class-transformer';

export class WorkDetailsDto {
  @IsOptional()
  @IsUUID()
  id: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  employee: DeepPartial<Employee>;

  @IsInt()
  @IsPositive()
  value_pay: number;
}
