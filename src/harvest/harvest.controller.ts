import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';

import { Response } from 'express';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetSubdomain } from 'src/common/decorators/get-subdomain.decorator';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { PathsController } from 'src/common/interfaces/PathsController';

import { HarvestDto } from './dto/harvest.dto';
import { QueryParamsHarvest } from './dto/query-params-harvest.dto';

import { Harvest } from './entities/harvest.entity';
import { HarvestService } from './harvest.service';
import { HarvestProcessedDto } from './dto/harvest-processed.dto';
import { ResponseStatusInterceptor } from 'src/common/interceptors/response-status.interceptor';

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
  findOneHarvest: {
    path: 'one/:id',
    description: 'obtener 1 cosecha',
    name: 'find_one_harvest',
  },
  findOneHarvestProcessedAll: {
    path: 'processed/all',
    description: 'obtener todas las cosechas procesadas',
    name: 'find_one_harvest_processed_all',
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
  exportHarvestToPDF: {
    path: 'export/one/pdf/:id',
    description: 'exportar cosecha a PDF',
    name: 'export_harvest_to_pdf',
  },
};

const {
  createHarvest,
  createHarvestProcessed,
  findAllHarvests,
  findOneHarvest,
  updateHarvest,
  updateHarvestProcessed,
  removeHarvest,
  removeHarvestProcessed,
  removeHarvests,
  exportHarvestToPDF,
} = pathsHarvestsController;

@Auth()
@Controller('harvests')
export class HarvestController {
  constructor(private readonly harvestService: HarvestService) {}

  @Get(exportHarvestToPDF.path)
  async exportHarvestToPDF(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSubdomain() subdomain: string,
    @Res() response: Response,
  ) {
    const pdfDoc = await this.harvestService.exportHarvestToPDF(id, subdomain);
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = 'Registro de cosecha';
    pdfDoc.info.Author = 'CropCo-System';
    pdfDoc.info.Keywords = 'report-harvest';
    pdfDoc.info.CreationDate = new Date();
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  @Post(createHarvest.path)
  create(@Body() createHarvestDto: HarvestDto) {
    return this.harvestService.create(createHarvestDto);
  }

  @Post(createHarvestProcessed.path)
  createHarvestProcessed(
    @Body() createHarvestProcessedDto: HarvestProcessedDto,
  ) {
    return this.harvestService.createHarvestProcessed(
      createHarvestProcessedDto,
    );
  }

  @Get(findAllHarvests.path)
  findAll(@Query() queryParams: QueryParamsHarvest) {
    return this.harvestService.findAll(queryParams);
  }

  @Get(findOneHarvest.path)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.findOne(id);
  }

  @Put(updateHarvest.path)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHarvestDto: HarvestDto,
  ) {
    return this.harvestService.update(id, updateHarvestDto);
  }

  @Put(updateHarvestProcessed.path)
  updateHarvestProcessed(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHarvestProcessedDto: HarvestProcessedDto,
  ) {
    return this.harvestService.updateHarvestProcessed(
      id,
      updateHarvestProcessedDto,
    );
  }

  @Delete(removeHarvest.path)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.remove(id);
  }

  @Delete(removeHarvestProcessed.path)
  removeHarvestProcessed(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.removeHarvestProcessed(id);
  }

  @Delete(removeHarvests.path)
  @UseInterceptors(ResponseStatusInterceptor)
  removeBulk(@Body() removeBulkHarvestsDto: RemoveBulkRecordsDto<Harvest>) {
    return this.harvestService.removeBulk(removeBulkHarvestsDto);
  }
}
