import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';
import { WorkDetails } from '../entities/work-details.entity';
import { Type } from 'class-transformer';
import { SaleDetailsDto } from 'src/sales/dto/sale-details.dto';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { WorkDetailsDto } from './work-details.dto';

export class CreateWorkDto {
  @IsDateString()
  date: string;

  @IsString()
  @Length(0, 500)
  description: string;

  @IsInt()
  @IsPositive()
  total: number;

  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => WorkDetailsDto)
  details: WorkDetailsDto[];
}
