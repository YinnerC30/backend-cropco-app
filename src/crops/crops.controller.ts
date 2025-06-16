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
  Req,
  UseInterceptors,
} from '@nestjs/common';

import { Auth } from 'src/auth/decorators/auth.decorator';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { ResponseStatusInterceptor } from 'src/common/interceptors/response-status.interceptor';
import { PathsController } from 'src/common/interfaces/PathsController';
import { CropsService } from './crops.service';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { Crop } from './entities/crop.entity';
import { Request } from 'express';

export const pathsCropsController: PathsController = {
  createCrop: {
    path: 'create',
    description: 'crear cultivo',
    name: 'create_crop',
  },
  findAllCrops: {
    path: 'all',
    description: 'obtener todos los cultivos',
    name: 'find_all_crops',
  },
  findOneCrop: {
    path: 'one/:id',
    description: 'obtener 1 cultivo',
    name: 'find_one_crop',
  },
  findAllCropsWithHarvest: {
    path: 'with-harvest/all',
    description: 'obtener solo cultivos con cosechas',
    name: 'find_all_crops_with_harvest',
  },
  findAllCropsWithWork: {
    path: 'with-work/all',
    description: 'obtener solo cultivos con trabajos realizados',
    name: 'find_all_crops_with_work',
  },
  findAllCropsWithSales: {
    path: 'with-sales/all',
    description: 'obtener solo cultivos con ventas realizadas',
    name: 'find_all_crops_with_sales',
  },
  findAllCropsWithConsumptions: {
    path: 'with-consumptions/all',
    description: 'obtener solo cultivos con consumos vinculados',
    name: 'find_all_crops_with_consumptions',
  },
  updateCrop: {
    path: 'update/one/:id',
    description: 'actualizar 1 cultivo',
    name: 'update_one_crop',
  },
  removeCrop: {
    path: 'remove/one/:id',
    description: 'eliminar 1 cultivo',
    name: 'remove_one_crop',
  },
  removeCrops: {
    path: 'remove/bulk',
    description: 'eliminar varios cultivos',
    name: 'remove_bulk_crops',
  },
  findAllCropsStock: {
    path: 'stock/all',
    description: 'obtener el stock de todos los cultivos',
    name: 'find_all_crops_stock',
  },
};

const {
  createCrop,
  findAllCrops,
  findOneCrop,
  findAllCropsWithHarvest,
  findAllCropsWithWork,
  findAllCropsWithSales,
  findAllCropsWithConsumptions,
  updateCrop,
  removeCrop,
  removeCrops,
  findAllCropsStock,
} = pathsCropsController;

// @Auth()
@Controller('crops')
export class CropsController {
  constructor(private readonly cropsService: CropsService) {}

  @Get(findAllCropsStock.path)
  findAllHarvestStock() {
    return this.cropsService.findAllCropsWithStock();
  }

  // Crear cultivo
  @Post(createCrop.path)
  // Método
  create(@Body() createCropDto: CreateCropDto) {
    return this.cropsService.create(createCropDto);
  }

  // Obtener todos los cultivos
  @Get(findAllCrops.path)
  // Documentación
  findAll(@Query() queryParams: QueryParamsDto, @Req() req: Request) {
    const tenantConnection = req['tenantConnection'];
    return this.cropsService.findAll(queryParams, tenantConnection);
  }

  @Get(findAllCropsWithHarvest.path)
  findAllWithHarvest(@Query() queryParams: QueryParamsDto) {
    return this.cropsService.findAllWithHarvest(queryParams);
  }

  @Get(findAllCropsWithSales.path)
  findAllWithSales() {
    return this.cropsService.findAllWithSales();
  }
  @Get(findAllCropsWithWork.path)
  findAllWithWork() {
    return this.cropsService.findAllWithWork();
  }
  @Get(findAllCropsWithConsumptions.path)
  findAllCropsWithConsumptions() {
    return this.cropsService.findAllWithConsumptions();
  }

  // Obtener 1 cultivo
  @Get(findOneCrop.path)
  // Documentación

  // Método
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cropsService.findOne(id);
  }

  // Actualización de 1 cultivo
  @Patch(updateCrop.path)
  // Documentación

  // Método
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCropDto: UpdateCropDto,
  ) {
    return this.cropsService.update(id, updateCropDto);
  }

  // Eliminación de 1 cultivo
  @Delete(removeCrop.path)
  // Documentación

  // Método
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cropsService.remove(id);
  }

  @Delete(removeCrops.path)
  @UseInterceptors(ResponseStatusInterceptor)
  async removeBulk(@Body() removeBulkCropsDto: RemoveBulkRecordsDto<Crop>) {
    return this.cropsService.removeBulk(removeBulkCropsDto);
  }
}
