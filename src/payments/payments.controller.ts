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

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({
    status: 201,
    description: 'The payment has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Return all payments.' })
  @ApiQuery({ type: QueryParams })
  findAll(@Query() queryParams: QueryParams) {
    return this.paymentsService.findAll(queryParams);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment by id' })
  @ApiResponse({ status: 200, description: 'Return the payment.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Payment id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Delete(':id')
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
