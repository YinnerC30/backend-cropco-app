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
import { ApiProperty } from '@nestjs/swagger';
import { HasAtLeastOneCategory } from '../decorators/validate-categories.decorator';

export class PaymentDto {
  @ApiProperty({
    description: 'Fecha del pago',
    type: String,
    format: 'date',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'ID del empleado',
    type: String,
    format: 'uuid',
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  employee: DeepPartial<Employee>;

  @ApiProperty({
    description: 'Método de pago',
    enum: ['EFECTIVO', 'TRANSFERENCIA', 'INTERCAMBIO'],
  })
  @IsString()
  @IsIn(['EFECTIVO', 'TRANSFERENCIA', 'INTERCAMBIO'])
  method_of_payment: MethodOfPayment;

  @ApiProperty({
    description: 'Monto total del pago',
    type: Number,
    minimum: 1,
  })
  @IsInt()
  @IsPositive()
  value_pay: number;

  @ApiProperty({
    description: 'Categorías de pago',
    type: PaymentCategoriesDto,
  })
  @HasAtLeastOneCategory()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PaymentCategoriesDto)
  categories: PaymentCategoriesDto;
}
