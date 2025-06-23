import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';

import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { PaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';
import { QueryParamsPayment } from './dto/query-params-payment.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { Payment } from './entities/payment.entity';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { Response } from 'express';
import { ResponseStatusInterceptor } from 'src/common/interceptors/response-status.interceptor';
import { GetSubdomain } from 'src/common/decorators/get-subdomain.decorator';

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
  exportPaymentToPDF: {
    path: 'export/one/pdf/:id',
    description: 'exportar pago a PDF',
    name: 'export_payment_to_pdf',
  },
};

const {
  createPayment,
  findAllPayments,
  findOnePayment,
  removePayment,
  removePayments,
  exportPaymentToPDF,
} = pathsPaymentsController;

@Auth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(createPayment.path)
  create(@Body() createPaymentDto: PaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get(findAllPayments.path)
  findAll(@Query() queryParams: QueryParamsPayment) {
    return this.paymentsService.findAll(queryParams);
  }

  @Get(findOnePayment.path)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Get(exportPaymentToPDF.path)
  async exportWorkToPDF(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
    @GetSubdomain() subdomain: string,
  ) {
    const pdfDoc = await this.paymentsService.exportPaymentToPDF(id, subdomain);
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = 'Registro de pago';
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  @Delete(removePayment.path)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.remove(id);
  }

  @Delete(removePayments.path)
  @UseInterceptors(ResponseStatusInterceptor)
  removeBulk(@Body() removeBulkPaymentsDto: RemoveBulkRecordsDto<Payment>) {
    return this.paymentsService.removeBulk(removeBulkPaymentsDto);
  }
}
