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
  UseInterceptors,
} from '@nestjs/common';
import { ConsumptionsService } from './consumptions.service';

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { PathsController } from 'src/common/interfaces/PathsController';

import { ConsumptionSuppliesDto } from './dto/consumption-supplies.dto';
import { QueryParamsConsumption } from './dto/query-params-consumption.dto';
import { SuppliesConsumption } from './entities/supplies-consumption.entity';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ResponseStatusInterceptor } from 'src/common/interceptors/response-status.interceptor';

export const pathsConsumptionController: PathsController = {
  createConsumption: {
    path: 'create',
    description: 'crear consumo de suplementos',
    name: 'create_supply_consumption',
  },

  findAllConsumption: {
    path: 'all',
    description: 'obtener todos los consumos de suplementos',
    name: 'find_all_supplies_consumption',
  },

  findOneConsumption: {
    path: 'one/:id',
    description: 'obtener 1 consumo',
    name: 'find_one_supplies_consumption',
  },

  updateConsumption: {
    path: 'update/one/:id',
    description: 'actualizar 1 consumo',
    name: 'update_one_supplies_consumption',
  },

  removeConsumption: {
    path: 'remove/one/:id',
    description: 'eliminar 1 consumo',
    name: 'remove_one_supplies_consumption',
  },
  removeBulkConsumptions: {
    path: 'remove/bulk',
    description: 'eliminar varios consumos',
    name: 'remove_bulk_supplies_consumption',
  },
};

const {
  createConsumption,
  findAllConsumption,
  findOneConsumption,
  updateConsumption,
  removeConsumption,
  removeBulkConsumptions,
} = pathsConsumptionController;
@Auth()
@Controller('consumptions')
export class ConsumptionsController {
  constructor(private readonly consumptionsService: ConsumptionsService) {}

  @Post(createConsumption.path)
  create(@Body() createConsumptionSuppliesDto: ConsumptionSuppliesDto) {
    return this.consumptionsService.createConsumption(
      createConsumptionSuppliesDto,
    );
  }

  @Get(findAllConsumption.path)
  findAllConsumptions(@Query() queryParams: QueryParamsConsumption) {
    return this.consumptionsService.findAllConsumptions(queryParams);
  }

  @Get(findOneConsumption.path)
  findOneConsumption(@Param('id', ParseUUIDPipe) id: string) {
    return this.consumptionsService.findOneConsumption(id);
  }

  @Patch(updateConsumption.path)
  updateConsumption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSuppliesConsumptionDto: ConsumptionSuppliesDto,
  ) {
    return this.consumptionsService.updateConsumption(
      id,
      updateSuppliesConsumptionDto,
    );
  }

  @Delete(removeConsumption.path)
  removeConsumption(@Param('id', ParseUUIDPipe) id: string) {
    return this.consumptionsService.removeConsumption(id);
  }

  @Delete(removeBulkConsumptions.path)
  @UseInterceptors(ResponseStatusInterceptor)
  removeBulkConsumption(
    @Body() removeBulkConsumptionDto: RemoveBulkRecordsDto<SuppliesConsumption>,
  ) {
    return this.consumptionsService.removeBulkConsumption(
      removeBulkConsumptionDto,
    );
  }
}
