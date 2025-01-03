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
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';

export const pathsHarvestsController: PathsController = {
  createHarvest: {
    path: 'create',
    description: 'crear cosecha',
    name: 'create_harvest',
  },
  createHarvestProcessed: {
    path: 'processed/create',
    description: 'crear cosecha procesada',
    name: 'create_harvest_processed',
  },
  findAllHarvests: {
    path: 'all',
    description: 'obtener todas las cosechas',
    name: 'find_all_harvests',
  },
  findAllHarvestsProcessed: {
    path: 'processed/all',
    description: 'obtener todas las cosechas procesadas',
    name: 'find_all_harvests_processed',
  },
  findAllCropsStock: {
    path: 'stock/all',
    description: 'obtener el stock de todos los cultivos',
    name: 'find_all_crops_stock',
  },
  findAllHarvestsWithPendingPayments: {
    path: 'pending-payments/all',
    description: 'obtener todas las cosechas con pagos pendientes',
    name: 'find_all_harvests_with_pending_payments',
  },
  findOneEmployeeWithPendingPayments: {
    path: 'pending-payments/one/:id',
    description: 'obtener los pagos pendientes de cosecha de 1 empleado',
    name: 'find_one_employee_with_harvests_pending_payments',
  },
  findOneHarvest: {
    path: 'one/:id',
    description: 'obtener 1 cosecha',
    name: 'find_one_harvest',
  },
  findOneHarvestProcessed: {
    path: 'processed/one/:id',
    description: 'obtener 1 cosecha procesada',
    name: 'find_one_harvest_processed',
  },
  updateHarvest: {
    path: 'update/one/:id',
    description: 'actualizar 1 cosecha',
    name: 'update_one_harvest',
  },
  updateHarvestProcessed: {
    path: 'processed/update/one/:id',
    description: 'actualizar 1 cosecha procesada',
    name: 'update_one_harvest_processed',
  },
  removeHarvest: {
    path: 'remove/one/:id',
    description: 'eliminar 1 cosecha',
    name: 'remove_one_harvest',
  },
  removeHarvests: {
    path: 'remove/bulk',
    description: 'eliminar varias cosechas',
    name: 'remove_bulk_harvests',
  },
  removeHarvestProcessed: {
    path: 'processed/remove/one/:id',
    description: 'eliminar 1 cosecha procesada',
    name: 'remove_one_harvest_processed',
  },
};

const {
  createHarvest,
  createHarvestProcessed,
  findAllHarvests,
  findAllHarvestsProcessed,
  findAllCropsStock,
  findAllHarvestsWithPendingPayments,
  findOneEmployeeWithPendingPayments,
  findOneHarvest,
  findOneHarvestProcessed,
  updateHarvest,
  updateHarvestProcessed,
  removeHarvest,
  removeHarvestProcessed,
  removeHarvests,
} = pathsHarvestsController;

@Auth()
@ApiTags('Harvests')
@Controller('harvests')
export class HarvestController {
  constructor(private readonly harvestService: HarvestService) {}

  @Post(createHarvest.path)
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

  @Post(createHarvestProcessed.path)
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

  @Get(findAllHarvests.path)
  @ApiResponse({
    status: 200,
    description: 'Se han obtenido todos los registros de cosecha',
    type: Harvest,
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() queryParams: QueryParamsHarvest) {
    return this.harvestService.findAll(queryParams);
  }

  @Get(findAllCropsStock.path)
  @ApiResponse({
    status: 200,
    description: 'Se han obtenido todas las cosechas con su respectivo Stock',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAllHarvestStock() {
    return this.harvestService.findAllHarvestStock();
  }

  @Get(findAllHarvestsProcessed.path)
  @ApiResponse({ status: 200, description: 'List of all processed harvests' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAllHarvestProcessed() {
    return this.harvestService.findAllHarvestProcessed();
  }

  @Get(findOneHarvest.path)
  @ApiResponse({ status: 200, description: 'Found harvest by ID' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.findOne(id);
  }

  @Get(findOneHarvestProcessed.path)
  @ApiResponse({ status: 200, description: 'Found processed harvest by ID' })
  @ApiResponse({ status: 404, description: 'Processed harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOneHarvestProcessed(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.findOneHarvestProcessed(id);
  }

  @Patch(updateHarvest.path)
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

  @Patch(updateHarvestProcessed.path)
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

  @Delete(removeHarvest.path)
  @ApiResponse({ status: 200, description: 'Harvest deleted' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.remove(id);
  }

  @Delete(removeHarvestProcessed.path)
  @ApiResponse({ status: 200, description: 'Processed harvest deleted' })
  @ApiResponse({ status: 404, description: 'Processed harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  removeHarvestProcessed(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.removeHarvestProcessed(id);
  }

  @Delete(removeHarvests.path)
  removeBulk(@Body() removeBulkHarvestsDto: RemoveBulkRecordsDto<Harvest>) {
    return this.harvestService.removeBulk(removeBulkHarvestsDto);
  }
}
