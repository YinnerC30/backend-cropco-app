import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkDto } from './create-work.dto';
import {
  IsDateString,
  IsString,
  Length,
  IsInt,
  IsPositive,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';

export class UpdateWorkDto {
  @IsOptional()
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  value_pay: number;

  @IsOptional()
  @IsBoolean()
  payment_is_pending?: boolean;

  @IsOptional()
  @IsUUID()
  employee: DeepPartial<Employee>;

  @IsOptional()
  @IsUUID()
  crop: DeepPartial<Crop>;
}
