import {
  IsDateString,
  IsEmail,
  IsNumber,
  IsNumberString,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class EmployeeCertificationDto {
  /**
   * Name of the person generating the certification.
   */
  @IsString()
  @MaxLength(100)
  generator_name: string;

  /**
   * Position of the person generating the certification.
   */
  @IsString()
  @MaxLength(100)
  generator_position: string;

  /**
   * Name of the company.
   */
  @IsString()
  @MaxLength(150)
  company_name: string;

  /**
   * Start date of employment.
   */
  @IsDateString()
  start_date: Date;

  /**
   * Employee position.
   */
  @IsString()
  @MaxLength(100)
  employee_position: string;

  /**
   * Number of weekly working hours.
   */
  @IsNumber()
  @Min(1)
  @Max(168)
  weekly_working_hours: number;

  @IsNumberString()
  @MinLength(5)
  @MaxLength(20)
  id_number: string;
}
