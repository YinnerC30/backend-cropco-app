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
  UseInterceptors,
} from '@nestjs/common';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';
import { Supply } from './entities';
import { SuppliesService } from './supplies.service';
import { Response } from 'express';
import { ResponseStatusInterceptor } from 'src/common/interceptors/response-status.interceptor';

export const pathsSuppliesController: PathsController = {
  createSupply: {
    path: 'create',
    description: 'crear un suplemento',
    name: 'create_supply',
  },

  findAllSupplies: {
    path: 'all',
    description: 'obtener todos los suplementos',
    name: 'find_all_supplies',
  },
  findAllSuppliesWithShopping: {
    path: 'shopping/all',
    description: 'obtener todos los insumos con compras',
    name: 'find_all_supplies_with_shopping',
  },
  findAllSuppliesWithConsumptions: {
    path: 'consumptions/all',
    description: 'obtener todos los insumos con consumos',
    name: 'find_all_supplies_with_consumptions',
  },
  findAllStock: {
    path: 'stock/all',
    description: 'obtener el stock de todos los suplementos',
    name: 'find_all_supplies_with_stock',
  },

  findOneSupply: {
    path: 'one/:id',
    description: 'obtener 1 suplemento',
    name: 'find_one_supply',
  },

  updateSupply: {
    path: 'update/one/:id',
    description: 'actualizar suplemento',
    name: 'update_one_supply',
  },

  removeSupply: {
    path: 'remove/one/:id',
    description: 'eliminar 1 suplemento',
    name: 'remove_one_supply',
  },
  removeSupplies: {
    path: 'remove/bulk',
    description: 'eliminar varios suministros',
    name: 'remove_bulk_supplies',
  },
};

const {
  createSupply,
  findAllSupplies,
  findOneSupply,
  updateSupply,
  removeSupply,
  removeSupplies,
  findAllStock,
  findAllSuppliesWithShopping,
  findAllSuppliesWithConsumptions,
} = pathsSuppliesController;

@Auth()
@Controller('supplies')
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Get(findAllSupplies.path)
  findAll(@Query() queryParams: QueryParamsDto) {
    return this.suppliesService.findAll(queryParams);
  }
  @Get(findAllSuppliesWithShopping.path)
  findAllSuppliesWithShopping() {
    return this.suppliesService.findAllSuppliesWithShopping();
  }
  @Get(findAllSuppliesWithConsumptions.path)
  findAllSuppliesWithConsumptions() {
    return this.suppliesService.findAllWithConsumptions();
  }

  @Get(findAllStock.path)
  findAllSuppliesStock() {
    return this.suppliesService.findAllSuppliesStock();
  }

  @Get(findOneSupply.path)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findOne(id);
  }

  @Post(createSupply.path)
  create(@Body() createSupplyDto: CreateSupplyDto) {
    return this.suppliesService.create(createSupplyDto);
  }

  @Patch(updateSupply.path)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplyDto: UpdateSupplyDto,
  ) {
    return this.suppliesService.update(id, updateSupplyDto);
  }

  @Delete(removeSupply.path)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.remove(id);
  }

  @Delete(removeSupplies.path)
  @UseInterceptors(ResponseStatusInterceptor)
  async removeBulk(
    @Body() removeBulkSuppliesDto: RemoveBulkRecordsDto<Supply>,
  ) {
    return await this.suppliesService.removeBulk(removeBulkSuppliesDto);
  }
}
