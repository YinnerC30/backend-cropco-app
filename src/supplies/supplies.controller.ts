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
import { QueryParams } from 'src/common/dto/QueryParams';
import { CreateConsumptionSuppliesDto } from './dto/create-consumption-supplies.dto';
import { CreatePurchaseSuppliesDto } from './dto/create-purchase-supplies.dto';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSuppliesConsumptionDto } from './dto/update-supplies-consumption.dto';
import { UpdateSuppliesPurchaseDto } from './dto/update-supplies-purchase.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';
import { SuppliesService } from './supplies.service';
import { ApiTags } from '@nestjs/swagger';
import { QueryParamsShopping } from './dto/query-params-shopping.dto';
import { QueryParamsConsumption } from './dto/query-params-consumption.dto';
import { PathsController } from 'src/common/interfaces/PathsController';

export const pathsSuppliesController: PathsController = {
  createSupply: { path: 'create', description: 'crear un suplemento' },
  createPurchase: {
    path: 'purchase/create',
    description: 'crear compra de suplementos',
  },
  createConsumption: {
    path: 'consumption/create',
    description: 'crear consumo de suplementos',
  },
  findAllSupplies: { path: 'all', description: 'obtener todos los suplementos' },
  findAllStock: {
    path: 'stock/all',
    description: 'obtener el stock de todos los suplementos',
  },
  findAllPurchase: { path: 'purchase/all', description: 'obtener todas las compras' },
  findAllConsumption: {
    path: 'consumption/all',
    description: 'obtener todos los consumos de suplementos',
  },
  findOneSupply: { path: 'one/:id', description: 'obtener 1 suplemento' },
  findOnePurchase: { path: 'purchase/one/:id', description: 'obtener 1 compra' },
  findOneConsumption: {
    path: 'consumption/one/:id',
    description: 'obtener 1 consumo',
  },
  updateSupply: { path: 'update/one/:id', description: 'actualizar suplemento' },
  updatePurchase: {
    path: 'purchase/update/one/:id',
    description: 'actualizar 1 compra',
  },
  updateConsumption: {
    path: 'consumption/update/one/:id',
    description: 'actualizar 1 consumo',
  },
  removeSupply: { path: 'remove/one/:id', description: 'eliminar 1 suplemento' },
  removePurchase: {
    path: 'purchase/remove/one/:id',
    description: 'eliminar 1 compra',
  },
  removeConsumption: {
    path: 'consumption/remove/one/:id',
    description: 'eliminar 1 consumo',
  },
};

const {
  createSupply,
  createPurchase,
  createConsumption,
  findAllSupplies,
  findAllStock,
  findAllPurchase,
  findAllConsumption,
  findOneSupply,
  findOnePurchase,
  findOneConsumption,
  updateSupply,
  updatePurchase,
  updateConsumption,
  removeSupply,
  removePurchase,
  removeConsumption,
} = pathsSuppliesController;

@ApiTags('Supplies')
@Controller('supplies')
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Get(findAllSupplies.path)
  findAll(@Query() queryParams: QueryParams) {
    return this.suppliesService.findAll(queryParams);
  }

  @Get(findAllStock.path)
  findAllSuppliesStock(@Query() queryParams: QueryParams) {
    return this.suppliesService.findAllSuppliesStock(queryParams);
  }

  @Get(findAllPurchase.path)
  findAllPurchases(@Query() queryParams: QueryParamsShopping) {
    return this.suppliesService.findAllPurchases(queryParams);
  }
  @Get(findAllConsumption.path)
  findAllConsumptions(@Query() queryParams: QueryParamsConsumption) {
    return this.suppliesService.findAllConsumptions(queryParams);
  }

  @Get(findOneSupply.path)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findOne(id);
  }

  @Get(findOnePurchase.path)
  findOnePurchase(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findOnePurchase(id);
  }

  @Get(findOneConsumption.path)
  findOneConsumption(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findOneConsumption(id);
  }

  @Post(createSupply.path)
  create(@Body() createSupplyDto: CreateSupplyDto) {
    return this.suppliesService.create(createSupplyDto);
  }

  @Post(createPurchase.path)
  purchase(@Body() createPurchaseSuppliesDto: CreatePurchaseSuppliesDto) {
    return this.suppliesService.createPurchase(createPurchaseSuppliesDto);
  }

  @Post(createConsumption.path)
  consumption(
    @Body() createConsumptionSuppliesDto: CreateConsumptionSuppliesDto,
  ) {
    return this.suppliesService.createConsumption(createConsumptionSuppliesDto);
  }

  @Patch(updateSupply.path)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplyDto: UpdateSupplyDto,
  ) {
    return this.suppliesService.update(id, updateSupplyDto);
  }

  @Patch(updatePurchase.path)
  updatePurchase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSuppliesPurchaseDto: UpdateSuppliesPurchaseDto,
  ) {
    return this.suppliesService.updatePurchase(id, updateSuppliesPurchaseDto);
  }

  @Patch(updateConsumption.path)
  updateConsumption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSuppliesConsumptionDto: UpdateSuppliesConsumptionDto,
  ) {
    return this.suppliesService.updateConsumption(
      id,
      updateSuppliesConsumptionDto,
    );
  }

  @Delete(removeSupply.path)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.remove(id);
  }

  @Delete(removePurchase.path)
  removePurchase(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.removePurchase(id);
  }

  @Delete(removeConsumption.path)
  removeConsumption(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.removeConsumption(id);
  }
}
