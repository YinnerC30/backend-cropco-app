import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsPositive,
  IsString,
  Length,
  ValidateNested
} from 'class-validator';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { WorkDetailsDto } from './create-work-details.dto';

export class CreateWorkDto {
  @IsDateString()
  date: string;

  @IsString()
  @Length(50, 500)
  description: string;

  @IsInt()
  @IsPositive()
  total: number;

  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => WorkDetailsDto)
  details: WorkDetailsDto[];
}
