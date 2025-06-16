import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { SaleDto } from './dto/sale.dto';
import { QueryParamsSale } from './dto/query-params-sale.dto';
import { SalesService } from './sales.service';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Sale } from './entities/sale.entity';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { Response } from 'express';
import { ResponseStatusInterceptor } from 'src/common/interceptors/response-status.interceptor';

export const pathsSalesController: PathsController = {
  createSale: {
    path: 'create',
    description: 'crear venta',
    name: 'create_sale',
  },
  findAllSales: {
    path: 'all',
    description: 'obtener todas las ventas',
    name: 'find_all_sales',
  },
  findOneSale: {
    path: 'one/:id',
    description: 'obtener 1 venta',
    name: 'find_one_sale',
  },
  updateSale: {
    path: 'update/one/:id',
    description: 'actualizar 1 venta',
    name: 'update_one_sale',
  },
  removeSale: {
    path: 'remove/one/:id',
    description: 'eliminar 1 venta',
    name: 'remove_one_sale',
  },
  removeSales: {
    path: 'remove/bulk',
    description: 'eliminar varias ventas',
    name: 'remove_bulk_sales',
  },
  exportSaleToPDF: {
    path: 'export/one/pdf/:id',
    description: 'exportar venta a PDF',
    name: 'export_sale_to_pdf',
  },
};

const {
  createSale,
  findAllSales,
  findOneSale,
  updateSale,
  removeSale,
  removeSales,
  exportSaleToPDF,
} = pathsSalesController;

// @Auth()
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post(createSale.path)
  create(@Body() createSaleDto: SaleDto) {
    return this.salesService.create(createSaleDto);
  }

  @Get(exportSaleToPDF.path)
  async exportWorkToPDF(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const pdfDoc = await this.salesService.exportSaleToPDF(id);
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = 'Registro de venta';
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  @Get(findAllSales.path)
  findAll(@Query() queryParams: QueryParamsSale) {
    return this.salesService.findAll(queryParams);
  }

  @Get(findOneSale.path)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.findOne(id);
  }

  @Put(updateSale.path)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSaleDto: SaleDto,
  ) {
    return this.salesService.update(id, updateSaleDto);
  }

  @Delete(removeSale.path)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.remove(id);
  }

  @Delete(removeSales.path)
  @UseInterceptors(ResponseStatusInterceptor)
  removeBulk(@Body() removeBulkSalesDto: RemoveBulkRecordsDto<Sale>) {
    return this.salesService.removeBulk(removeBulkSalesDto);
  }
}
