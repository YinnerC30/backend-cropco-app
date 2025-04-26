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
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { PathsController } from 'src/common/interfaces/PathsController';

import { HarvestDto } from './dto/harvest.dto';
import { QueryParamsHarvest } from './dto/query-params-harvest.dto';

import { Harvest } from './entities/harvest.entity';
import { HarvestService } from './harvest.service';
import { HarvestProcessedDto } from './dto/harvest-processed.dto';

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
@ApiTags('Harvests')
@Controller('harvests')
export class HarvestController {
  constructor(private readonly harvestService: HarvestService) {}

  @Get(exportHarvestToPDF.path)
  async exportHarvestToPDF(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const pdfDoc = await this.harvestService.exportHarvestToPDF(id);
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = 'Registro de cosecha';
    pdfDoc.info.Author = 'CropCo-System';
    pdfDoc.info.Keywords = 'report-harvest';
    pdfDoc.info.CreationDate = new Date();
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  @Post(createHarvest.path)
  @ApiResponse({
    status: 201,
    description: 'La cosecha ha sido creada',
    type: HarvestDto,
  })
  @ApiResponse({
    status: 400,
    description: 'La información proporcionada es incorrecta',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  create(@Body() createHarvestDto: HarvestDto) {
    return this.harvestService.create(createHarvestDto);
  }

  @Post(createHarvestProcessed.path)
  @ApiResponse({
    status: 201,
    description: 'Registro de cosecha procesado ha sido guardado',
    type: HarvestProcessedDto,
  })
  @ApiResponse({
    status: 400,
    description: 'La información proporcionada es incorrecta',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  createHarvestProcessed(
    @Body() createHarvestProcessedDto: HarvestProcessedDto,
  ) {
    return this.harvestService.createHarvestProcessed(
      createHarvestProcessedDto,
    );
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

  @Get(findOneHarvest.path)
  @ApiResponse({ status: 200, description: 'Found harvest by ID' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.findOne(id);
  }

  @Put(updateHarvest.path)
  @ApiResponse({ status: 200, description: 'Harvest updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHarvestDto: HarvestDto,
  ) {
    return this.harvestService.update(id, updateHarvestDto);
  }

  @Put(updateHarvestProcessed.path)
  @ApiResponse({ status: 200, description: 'Processed harvest updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Processed harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  async removeBulk(
    @Body() removeBulkHarvestsDto: RemoveBulkRecordsDto<Harvest>,
    @Res() response: Response,
  ) {
    const result = await this.harvestService.removeBulk(removeBulkHarvestsDto);
    if (result.failed && result.failed.length > 0) {
      return response.status(207).json(result);
    }
    return response.status(200).json(result);
  }
}
