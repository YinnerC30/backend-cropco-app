import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
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

  @IsInt()
  @IsPositive()
  amount: number;

  @IsInt()
  @IsPositive()
  value_pay: number;
}
