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
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { QueryParams } from 'src/common/dto/QueryParams';
import { CropsService } from './crops.service';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { Crop } from './entities/crop.entity';
import { PathsController } from 'src/common/interfaces/PathsController';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';

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
} = pathsCropsController;

@Auth()
@ApiTags('Crops')
@Controller('crops')
export class CropsController {
  constructor(private readonly cropsService: CropsService) {}

  // Crear cultivo

  @Post(createCrop.path)
  // Documentación
  @ApiOperation({ summary: 'Crear un nuevo cultivo' })
  @ApiCreatedResponse({ description: 'Cultivo creado', type: Crop })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido' })
  @ApiResponse({ status: 409, description: 'Conflicto' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  create(@Body() createCropDto: CreateCropDto) {
    return this.cropsService.create(createCropDto);
  }

  // Obtener todos los cultivos
  @Get(findAllCrops.path)
  // Documentación
  @ApiOperation({ summary: 'Obtener una lista de todos los cultivos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cultivos obtenida con éxito',
    type: [Crop],
  })
  @ApiResponse({ status: 400, description: 'Datos de consulta inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findAll(@Query() queryParams: QueryParams) {
    return this.cropsService.findAll(queryParams);
  }

  @Get(findAllCropsWithHarvest.path)
  findAllWithHarvest(@Query() queryParams: QueryParams) {
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
  @ApiOperation({ summary: 'Obtener los detalles de un cultivo específico' })
  @ApiResponse({
    status: 200,
    description: 'Detalles del cultivo obtenidos con éxito',
    type: Crop,
  })
  @ApiResponse({ status: 400, description: 'Identificador inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido' })
  @ApiResponse({ status: 404, description: 'Cultivo no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cropsService.findOne(id);
  }

  // Actualización de 1 cultivo
  @Patch(updateCrop.path)
  // Documentación
  @ApiOperation({ summary: 'Actualizar los detalles de un cultivo específico' })
  @ApiResponse({
    status: 200,
    description: 'Detalles del cultivo actualizados con éxito',
    type: Crop,
  })
  @ApiResponse({ status: 400, description: 'Datos de actualización inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido' })
  @ApiResponse({ status: 404, description: 'Cultivo no encontrado' })
  @ApiResponse({ status: 409, description: 'Conflicto' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
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
  @ApiOperation({ summary: 'Eliminar un cultivo específico' })
  @ApiResponse({ status: 200, description: 'Cultivo eliminado con éxito' })
  @ApiResponse({ status: 400, description: 'Identificador inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido' })
  @ApiResponse({ status: 404, description: 'Cultivo no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cropsService.remove(id);
  }

  @Delete(removeCrops.path)
  @ApiResponse({
    status: 200,
    description: 'Empleados eliminados exitosamente',
  })
  removeBulk(@Body() removeBulkCropsDto: RemoveBulkRecordsDto<Crop>) {
    return this.cropsService.removeBulk(removeBulkCropsDto);
  }
}
