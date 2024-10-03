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

export const pathsPaymentsController: PathsController = {
  createPayment: { path: 'create', name: 'crear pago' },
  getAll: { path: 'all', name: 'obtener todos los pagos' },
  getOnePayment: { path: 'one/:id', name: 'obtener 1 pago' },
  deletePayment: { path: 'delete/one/:id', name: 'eliminar 1 pago' },
};

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({
    status: 201,
    description: 'The payment has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Return all payments.' })
  @ApiQuery({ type: QueryParams })
  findAll(@Query() queryParams: QueryParamsPayment) {
    return this.paymentsService.findAll(queryParams);
  }

  @Get('one/:id')
  @ApiOperation({ summary: 'Get a payment by id' })
  @ApiResponse({ status: 200, description: 'Return the payment.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Payment id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Delete('delete/one/:id')
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
}
