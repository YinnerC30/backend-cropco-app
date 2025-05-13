import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Employee } from 'src/employees/entities/employee.entity';
import { DeepPartial } from 'typeorm';
import { PaymentCategoriesDto } from './payment-categories.dto';
import { MethodOfPayment } from '../entities/payment.entity';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { HasAtLeastOneCategory } from '../decorators/validate-categories.decorator';

export class PaymentDto {
  @IsDateString()
  date: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  employee: DeepPartial<Employee>;

  @IsString()
  @IsIn(['EFECTIVO', 'TRANSFERENCIA', 'INTERCAMBIO'])
  method_of_payment: MethodOfPayment;

  @IsInt()
  @IsPositive()
  value_pay: number;

  @HasAtLeastOneCategory()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PaymentCategoriesDto)
  categories: PaymentCategoriesDto;
}
