import { PartialType } from '@nestjs/swagger';
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
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';
import { Type } from 'class-transformer';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { WorkDetailsDto } from './work-details.dto';

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
  total: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => WorkDetailsDto)
  details: WorkDetailsDto[];
}
