import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { PathsController } from 'src/common/interfaces/PathsController';

import { QueryParamsShopping } from './dto/query-params-shopping.dto';
import { SuppliesShopping } from './entities';
import { ShoppingService } from './shopping.service';
import { Response } from 'express';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ResponseStatusInterceptor } from 'src/common/interceptors/response-status.interceptor';
import { ShoppingSuppliesDto } from './dto/shopping-supplies.dto';
import { GetSubdomain } from 'src/common/decorators/get-subdomain.decorator';

export const pathsShoppingController: PathsController = {
  createShopping: {
    path: 'create',
    description: 'crear compra de suplementos',
    name: 'create_supply_shopping',
  },

  findAllShopping: {
    path: 'all',
    description: 'obtener todas las compras',
    name: 'find_all_supplies_shopping',
  },

  findOneShopping: {
    path: 'one/:id',
    description: 'obtener 1 compra',
    name: 'find_one_supplies_shopping',
  },

  updateShopping: {
    path: 'update/one/:id',
    description: 'actualizar 1 compra',
    name: 'update_one_supplies_shopping',
  },

  removeShopping: {
    path: 'remove/one/:id',
    description: 'eliminar 1 compra',
    name: 'remove_one_supplies_shopping',
  },

  removeBulkShopping: {
    path: 'remove/bulk',
    description: 'eliminar varias compras',
    name: 'remove_bulk_supplies_shopping',
  },
  exportShoppingToPDF: {
    path: 'export/one/pdf/:id',
    description: 'exportar compra a PDF',
    name: 'export_shopping_to_pdf',
  },
};

const {
  createShopping,
  findAllShopping,
  findOneShopping,
  updateShopping,
  removeShopping,
  removeBulkShopping,
  exportShoppingToPDF,
} = pathsShoppingController;

@Auth()
@Controller('shopping')
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}

  @Get(findAllShopping.path)
  findAllShopping(@Query() queryParams: QueryParamsShopping) {
    return this.shoppingService.findAllShopping(queryParams);
  }
  @Get(findOneShopping.path)
  findOneShopping(@Param('id', ParseUUIDPipe) id: string) {
    return this.shoppingService.findOneShopping(id);
  }

  @Get(exportShoppingToPDF.path)
  @Header('Content-Type', 'application/pdf')
  async exportShoppingToPDF(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
    @GetSubdomain() subdomain: string,
  ) {
    const pdfDoc = await this.shoppingService.exportShoppingToPDF(
      id,
      subdomain,
    );
    response.setHeader(
      'Content-Disposition',
      `inline; filename="registro-compra-${id}.pdf"`,
    );
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  @Post(createShopping.path)
  create(@Body() createShoppingSuppliesDto: ShoppingSuppliesDto) {
    return this.shoppingService.createShopping(createShoppingSuppliesDto);
  }

  @Patch(updateShopping.path)
  updateShopping(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSuppliesShoppingDto: ShoppingSuppliesDto,
  ) {
    return this.shoppingService.updateShopping(id, updateSuppliesShoppingDto);
  }

  @Delete(removeShopping.path)
  removeShopping(@Param('id', ParseUUIDPipe) id: string) {
    return this.shoppingService.removeShopping(id);
  }

  @Delete(removeBulkShopping.path)
  @UseInterceptors(ResponseStatusInterceptor)
  removeBulkShopping(
    @Body() removeBulkShoppingDto: RemoveBulkRecordsDto<SuppliesShopping>,
  ) {
    return this.shoppingService.removeBulkShopping(removeBulkShoppingDto);
  }
}
