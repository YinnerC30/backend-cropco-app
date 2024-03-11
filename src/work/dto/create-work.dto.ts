import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';

export class CreateWorkDto {
  @IsDateString()
  date: string;

  @IsString()
  @Length(0, 500)
  description: string;

  @IsInt()
  @IsPositive()
  value_pay: number;

  @IsOptional()
  @IsBoolean()
  payment_is_pending?: boolean;

  @IsUUID()
  employee: DeepPartial<Employee>;

  @IsUUID()
  crop: DeepPartial<Crop>;
}
