import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
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
  @Length(15, 500)
  description: string;

  @IsNumber()
  @IsPositive()
  number_hectares: number;

  @IsNumber()
  @Min(1)
  units: number;

  @IsString()
  @Length(15, 150)
  location: string;

  @IsDateString()
  date_of_creation: string;

  @IsOptional()
  @IsDateString()
  date_of_termination: string;
}
