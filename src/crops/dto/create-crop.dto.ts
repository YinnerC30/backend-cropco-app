import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateCropDto {
  @IsString()
  @Length(4, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description: string;

  @IsNumber()
  @Min(0)
  number_hectares: number;

  @IsNumber()
  @Min(1)
  units: number;

  @IsString()
  @Length(4, 150)
  location: string;

  @IsDateString()
  date_of_creation: string;

  @IsOptional()
  @IsDateString()
  date_of_termination: string;
}

