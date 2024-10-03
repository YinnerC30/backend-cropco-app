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
  createSupply: { path: 'create', name: 'crear un suplemento' },
  createPurchase: {
    path: 'purchase/create',
    name: 'crear compra de suplementos',
  },
  getAll: { path: 'all', name: 'obtener todos los suplementos' },
  getAllStock: {
    path: 'stock/all',
    name: 'obtener el stock de todos los suplementos',
  },
  getAllPurchase: { path: 'purchase/all', name: 'obtener todas las compras' },
  getAllConsumption: {
    path: 'consumption/all',
    name: 'obtener todos los consumos de suplementos',
  },
  getOneSupply: { path: 'one/:id', name: 'obtener 1 suplemento' },
  getOnePurchase: { path: 'purchase/one/:id', name: 'obtener 1 compra' },
  getOneConsumption: { path: 'consumption/one/:id', name: 'obtener 1 consumo' },
  updateSupply: { path: 'update/one/:id', name: 'actualizar suplemento' },
  updatePurchase: {
    path: 'purchase/update/one/:id',
    name: 'actualizar 1 compra',
  },
  updateConsumption: {
    path: 'consumption/update/one/:id',
    name: 'actualizar 1 consumo',
  },
  deleteSupply: { path: 'delete/one/:id', name: 'eliminar 1 suplemento' },
  deletePurchase: {
    path: 'purchase/delete/one/:id',
    name: 'eliminar 1 compra',
  },
  deleteConsumption: {
    path: 'consumption/delete/one/:id',
    name: 'eliminar 1 consumo',
  },
};

@ApiTags('Supplies')
@Controller('supplies')
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Get('all')
  findAll(@Query() queryParams: QueryParams) {
    return this.suppliesService.findAll(queryParams);
  }

  @Get('stock/all')
  findAllSuppliesStock(@Query() queryParams: QueryParams) {
    return this.suppliesService.findAllSuppliesStock(queryParams);
  }

  @Get('purchase/all')
  findAllPurchases(@Query() queryParams: QueryParamsShopping) {
    return this.suppliesService.findAllPurchases(queryParams);
  }
  @Get('consumption/all')
  findAllConsumptions(@Query() queryParams: QueryParamsConsumption) {
    return this.suppliesService.findAllConsumptions(queryParams);
  }

  @Get('one/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findOne(id);
  }

  @Get('purchase/one/:id')
  findOnePurchase(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findOnePurchase(id);
  }

  @Get('consumption/one/:id')
  findOneConsumption(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findOneConsumption(id);
  }

  @Post('create')
  create(@Body() createSupplyDto: CreateSupplyDto) {
    return this.suppliesService.create(createSupplyDto);
  }

  @Post('purchase/create')
  purchase(@Body() createPurchaseSuppliesDto: CreatePurchaseSuppliesDto) {
    return this.suppliesService.createPurchase(createPurchaseSuppliesDto);
  }

  @Post('consumption/create')
  consumption(
    @Body() createConsumptionSuppliesDto: CreateConsumptionSuppliesDto,
  ) {
    return this.suppliesService.createConsumption(createConsumptionSuppliesDto);
  }

  @Patch('update/one/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplyDto: UpdateSupplyDto,
  ) {
    return this.suppliesService.update(id, updateSupplyDto);
  }

  @Patch('purchase/update/one/:id')
  updatePurchase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSuppliesPurchaseDto: UpdateSuppliesPurchaseDto,
  ) {
    return this.suppliesService.updatePurchase(id, updateSuppliesPurchaseDto);
  }

  @Patch('consumption/update/one/:id')
  updateConsumption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSuppliesConsumptionDto: UpdateSuppliesConsumptionDto,
  ) {
    return this.suppliesService.updateConsumption(
      id,
      updateSuppliesConsumptionDto,
    );
  }

  @Delete('delete/one/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.remove(id);
  }

  @Delete('purchase/delete/one/:id')
  removePurchase(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.removePurchase(id);
  }

  @Delete('consumption/delete/one/:id')
  removeConsumption(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.removeConsumption(id);
  }
}
