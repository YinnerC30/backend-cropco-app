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

@ApiTags('Supplies')
@Controller('supplies')
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Get()
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
  findAllConsumptions(@Query() queryParams: QueryParams) {
    return this.suppliesService.findAllConsumptions(queryParams);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findOne(id);
  }

  @Get('purchase/:id')
  findOnePurchase(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findOnePurchase(id);
  }

  @Get('consumption/:id')
  findOneConsumption(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findOneConsumption(id);
  }

  @Post()
  create(@Body() createSupplyDto: CreateSupplyDto) {
    return this.suppliesService.create(createSupplyDto);
  }

  @Post('/purchase')
  purchase(@Body() createPurchaseSuppliesDto: CreatePurchaseSuppliesDto) {
    return this.suppliesService.createPurchase(createPurchaseSuppliesDto);
  }

  @Post('/consumption')
  consumption(
    @Body() createConsumptionSuppliesDto: CreateConsumptionSuppliesDto,
  ) {
    return this.suppliesService.createConsumption(createConsumptionSuppliesDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplyDto: UpdateSupplyDto,
  ) {
    return this.suppliesService.update(id, updateSupplyDto);
  }

  @Patch('/purchase/:id')
  updatePurchase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSuppliesPurchaseDto: UpdateSuppliesPurchaseDto,
  ) {
    return this.suppliesService.updatePurchase(id, updateSuppliesPurchaseDto);
  }

  @Patch('/consumption/:id')
  updateConsumption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSuppliesConsumptionDto: UpdateSuppliesConsumptionDto,
  ) {
    return this.suppliesService.updateConsumption(
      id,
      updateSuppliesConsumptionDto,
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.remove(id);
  }

  @Delete('/purchase/:id')
  removePurchase(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.removePurchase(id);
  }

  @Delete('/consumption/:id')
  removeConsumption(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.removeConsumption(id);
  }
}
