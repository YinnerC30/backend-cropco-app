import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QueryParams } from 'src/common/dto/QueryParams';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';
import { QueryParamsPayment } from './dto/query-params-payment.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { Payment } from './entities/payment.entity';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';

export const pathsPaymentsController: PathsController = {
  createPayment: {
    path: 'create',
    description: 'crear pago',
    name: 'create_payment',
  },
  findAllPayments: {
    path: 'all',
    description: 'obtener todos los pagos',
    name: 'find_all_payments',
  },
  findOnePayment: {
    path: 'one/:id',
    description: 'obtener 1 pago',
    name: 'find_one_payment',
  },
  removePayment: {
    path: 'remove/one/:id',
    description: 'eliminar 1 pago',
    name: 'remove_one_payment',
  },
  removePayments: {
    path: 'remove/bulk',
    description: 'eliminar varios pagos',
    name: 'remove_bulk_payments',
  },
};

const {
  createPayment,
  findAllPayments,
  findOnePayment,
  removePayment,
  removePayments,
} = pathsPaymentsController;

@Auth()
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(createPayment.path)
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({
    status: 201,
    description: 'The payment has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get(findAllPayments.path)
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Return all payments.' })
  @ApiQuery({ type: QueryParams })
  findAll(@Query() queryParams: QueryParamsPayment) {
    return this.paymentsService.findAll(queryParams);
  }

  @Get(findOnePayment.path)
  @ApiOperation({ summary: 'Get a payment by id' })
  @ApiResponse({ status: 200, description: 'Return the payment.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Payment id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Delete(removePayment.path)
  @ApiOperation({ summary: 'Delete a payment' })
  @ApiResponse({
    status: 200,
    description: 'The payment has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Payment id' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.remove(id);
  }

  @Delete(removePayments.path)
  @ApiResponse({
    status: 200,
    description: 'Pagos eliminados exitosamente',
  })
  removeBulk(@Body() removeBulkPaymentsDto: RemoveBulkRecordsDto<Payment>) {
    return this.paymentsService.removeBulk(removeBulkPaymentsDto);
  }
}
