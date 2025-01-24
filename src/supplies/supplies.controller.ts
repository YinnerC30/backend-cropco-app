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
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { QueryParams } from 'src/common/dto/QueryParams';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';
import { Supply } from './entities';
import { SuppliesService } from './supplies.service';

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
  findAllStock: {
    path: 'stock/all',
    description: 'obtener el stock de todos los suplementos',
    name: 'find_all_supplies_stock',
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
} = pathsSuppliesController;

@Auth()
@ApiTags('Supplies')
@Controller('supplies')
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Get(findAllSupplies.path)
  findAll(@Query() queryParams: QueryParams) {
    return this.suppliesService.findAll(queryParams);
  }
  @Get(findAllSuppliesWithShopping.path)
  findAllSuppliesWithShopping() {
    return this.suppliesService.findAllSuppliesWithShopping();
  }

  @Get(findAllStock.path)
  findAllSuppliesStock(@Query() queryParams: QueryParams) {
    return this.suppliesService.findAllSuppliesStock(queryParams);
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
  @ApiResponse({
    status: 200,
    description: 'Suministros eliminados exitosamente',
  })
  removeBulk(@Body() removeBulkSuppliesDto: RemoveBulkRecordsDto<Supply>) {
    return this.suppliesService.removeBulk(removeBulkSuppliesDto);
  }
}
