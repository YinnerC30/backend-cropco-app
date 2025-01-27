import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { QueryParams } from 'src/common/dto/QueryParams';
import { PathsController } from 'src/common/interfaces/PathsController';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QueryParamsSale } from './dto/query-params-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SalesService } from './sales.service';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Sale } from './entities/sale.entity';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { Response } from 'express';

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

@Auth()
@ApiTags('Sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post(createSale.path)
  @ApiOperation({ summary: 'Create a new sale' })
  @ApiResponse({
    status: 201,
    description: 'The sale has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createSaleDto: CreateSaleDto) {
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
  @ApiOperation({ summary: 'Get all sales' })
  @ApiResponse({ status: 200, description: 'Return all sales.' })
  @ApiQuery({ type: QueryParams })
  findAll(@Query() queryParams: QueryParamsSale) {
    return this.salesService.findAll(queryParams);
  }

  @Get(findOneSale.path)
  @ApiOperation({ summary: 'Get a sale by id' })
  @ApiResponse({ status: 200, description: 'Return the sale.' })
  @ApiResponse({ status: 404, description: 'Sale not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Sale id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.findOne(id);
  }

  @Patch(updateSale.path)
  @ApiOperation({ summary: 'Update a sale' })
  @ApiResponse({
    status: 200,
    description: 'The sale has been successfully updated.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 404, description: 'Sale not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Sale id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSaleDto: UpdateSaleDto,
  ) {
    return this.salesService.update(id, updateSaleDto);
  }

  @Delete(removeSale.path)
  @ApiOperation({ summary: 'Delete a sale' })
  @ApiResponse({
    status: 200,
    description: 'The sale has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Sale not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Sale id' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.remove(id);
  }

  @Delete(removeSales.path)
  removeBulk(@Body() removeBulkSalesDto: RemoveBulkRecordsDto<Sale>) {
    return this.salesService.removeBulk(removeBulkSalesDto);
  }
}
