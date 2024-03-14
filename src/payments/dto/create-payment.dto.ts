import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';
import { PaymentCategoriesDto } from './payment-categories.dto';

export class CreatePaymentDto {
  @IsDateString()
  date: string;
  @IsUUID()
  employee: DeepPartial<Employee>;

  @IsString()
  @IsIn(['EFECTIVO', 'TRANSFERENCIA'])
  method_of_payment: string;

  @IsInt()
  @IsPositive()
  total: number;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PaymentCategoriesDto)
  categories: PaymentCategoriesDto;
}
