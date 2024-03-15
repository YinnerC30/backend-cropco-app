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
import { MethodOfPayment } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsDateString()
  date: string;
  @IsUUID()
  employee: DeepPartial<Employee>;

  // TODO: Crear enum
  @IsString()
  @IsIn(['EFECTIVO', 'TRANSFERENCIA', 'INTERCAMBIO'])
  method_of_payment: MethodOfPayment;

  @IsInt()
  @IsPositive()
  total: number;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PaymentCategoriesDto)
  categories: PaymentCategoriesDto;
}
