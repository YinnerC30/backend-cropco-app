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
import { CreateHarvestProcessedDto } from './dto/create-harvest-processed.dto';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestProcessedDto } from './dto/update-harvest-processed.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { HarvestService } from './harvest.service';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { Harvest } from './entities/harvest.entity';
import { QueryParamsHarvest } from './dto/query-params-harvest.dto';
import { PathsController } from 'src/common/interfaces/PathsController';

export const pathsHarvestsController: PathsController = {
  createHarvest: { path: 'create', name: 'crear cosecha' },
  createHarvestProcessed: {
    path: 'processed/create',
    name: 'crear cosecha procesada',
  },
  getAll: { path: 'all', name: 'obtener todas las cosechas' },
  getAllHarvestProcessed: {
    path: 'processed/all',
    name: 'obtener todas las cosechas procesadas',
  },
  getAllStock: {
    path: 'stock/all',
    name: 'obtener el stock de todos los cultivos',
  },
  getAllPendingPayments: {
    path: 'pending-payments/all',
    name: 'obtener todas las cosechas con pagos pendientes',
  },
  getOneEmployeePendingPayments: {
    path: 'pending-payments/one/:id',
    name: 'obtener los pagos pendientes de cosecha de 1 empleado',
  },
  getOneHarvest: { path: 'one/:id', name: 'obtener 1 cosecha' },
  getOneHarvestProcessed: {
    path: 'processed/one/:id',
    name: 'obtener 1 cosecha procesada',
  },
  updateHarvest: { path: 'update/one/:id', name: 'actualizar 1 cosecha' },
  updateHarvestProcessed: {
    path: 'processed/update/one/:id',
    name: 'actualizar 1 cosecha procesada',
  },
  deleteHarvest: { path: 'delete/one/:id', name: 'eliminar 1 cosecha' },
  deleteHarvestProcessed: {
    path: 'processed/delete/:id',
    name: 'eliminar 1 cosecha procesada',
  },
};

@ApiTags('Harvests')
@Controller('harvest')
export class HarvestController {
  constructor(private readonly harvestService: HarvestService) {}

  @Post('create')
  @ApiResponse({
    status: 201,
    description: 'La cosecha ha sido creada',
    type: CreateHarvestDto,
  })
  @ApiResponse({
    status: 400,
    description: 'La información proporcionada es incorrecta',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  create(@Body() createHarvestDto: CreateHarvestDto) {
    return this.harvestService.create(createHarvestDto);
  }

  @Post('processed/create')
  @ApiResponse({
    status: 201,
    description: 'Registro de cosecha procesado ha sido guardado',
    type: CreateHarvestProcessedDto,
  })
  @ApiResponse({
    status: 400,
    description: 'La información proporcionada es incorrecta',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  createHarvestProcessed(
    @Body() createHarvestProcessedDto: CreateHarvestProcessedDto,
  ) {
    return this.harvestService.createHarvestProcessed(
      createHarvestProcessedDto,
    );
  }

  @Get('deleteAll')
  @ApiResponse({
    status: 200,
    description: 'Todos los registros han sido eliminados',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  deleteAll() {
    return this.harvestService.deleteAllHarvest();
  }

  @Get('all')
  @ApiResponse({
    status: 200,
    description: 'Se han obtenido todos los registros de cosecha',
    type: Harvest,
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() queryParams: QueryParamsHarvest) {
    return this.harvestService.findAll(queryParams);
  }

  @Get('stock/all')
  @ApiResponse({
    status: 200,
    description: 'Se han obtenido todas las cosechas con su respectivo Stock',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAllHarvestStock(@Query() queryParams: QueryParams) {
    return this.harvestService.findAllHarvestStock(queryParams);
  }

  @Get('processed/all')
  @ApiResponse({ status: 200, description: 'List of all processed harvests' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAllHarvestProcessed(@Query() queryParams: QueryParams) {
    return this.harvestService.findAllHarvestProcessed(queryParams);
  }

  @Get('one/:id')
  @ApiResponse({ status: 200, description: 'Found harvest by ID' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.findOne(id);
  }

  @Get('processed/one/:id')
  @ApiResponse({ status: 200, description: 'Found processed harvest by ID' })
  @ApiResponse({ status: 404, description: 'Processed harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOneHarvestProcessed(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.findOneHarvestProcessed(id);
  }

  @Patch('update/one/:id')
  @ApiResponse({ status: 200, description: 'Harvest updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHarvestDto: UpdateHarvestDto,
  ) {
    return this.harvestService.update(id, updateHarvestDto);
  }

  @Patch('processed/update/one/:id')
  @ApiResponse({ status: 200, description: 'Processed harvest updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Processed harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  updateHarvestProcessed(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHarvestProcessedDto: UpdateHarvestProcessedDto,
  ) {
    return this.harvestService.updateHarvestProcessed(
      id,
      updateHarvestProcessedDto,
    );
  }

  @Delete('delete/one/:id')
  @ApiResponse({ status: 200, description: 'Harvest deleted' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.remove(id);
  }

  @Delete('processed/delete/one/:id')
  @ApiResponse({ status: 200, description: 'Processed harvest deleted' })
  @ApiResponse({ status: 404, description: 'Processed harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  removeHarvestProcessed(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.removeHarvestProcessed(id);
  }
}
