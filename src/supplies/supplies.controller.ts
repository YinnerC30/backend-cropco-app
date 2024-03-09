import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SuppliesService } from './supplies.service';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreatePurchaseSuppliesDto } from './dto/create-purchase-supplies.dto';
import { UpdateSuppliesPurchaseDto } from './dto/update-supplies-purchase.dto';
import { CreateConsumptionSuppliesDto } from './dto/create-consumption-supplies.dto';

@Controller('supplies')
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.suppliesService.findAll(paginationDto);
  }

  @Get('purchase/all')
  findAllPurchases(@Query() paginationDto: PaginationDto) {
    return this.suppliesService.findAllPurchases(paginationDto);
  }
  @Get('consumption/all')
  findAllConsumptions(@Query() paginationDto: PaginationDto) {
    return this.suppliesService.findAllConsumptions(paginationDto);
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
