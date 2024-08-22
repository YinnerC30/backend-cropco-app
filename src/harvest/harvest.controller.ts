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

@ApiTags('Harvests')
@Controller('harvest')
export class HarvestController {
  constructor(private readonly harvestService: HarvestService) {}

  @Post()
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

  @Post('processed')
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

  @Get()
  @ApiResponse({
    status: 200,
    description: 'Se han obtenido todos los registros de cosecha',
    type: Harvest,
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query() queryParams: QueryParamsHarvest) {
    
    return this.harvestService.findAll(queryParams);
  }

  @Get('stock')
  @ApiResponse({
    status: 200,
    description: 'Se han obtenido todas las cosechas con su respectivo Stock',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAllHarvestStock(@Query() queryParams: QueryParams) {
    return this.harvestService.findAllHarvestStock(queryParams);
  }

  @Get('processed')
  @ApiResponse({ status: 200, description: 'List of all processed harvests' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAllHarvestProcessed(@Query() queryParams: QueryParams) {
    return this.harvestService.findAllHarvestProcessed(queryParams);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Found harvest by ID' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.findOne(id);
  }

  @Get('processed/:id')
  @ApiResponse({ status: 200, description: 'Found processed harvest by ID' })
  @ApiResponse({ status: 404, description: 'Processed harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOneHarvestProcessed(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.findOneHarvestProcessed(id);
  }

  @Patch(':id')
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

  @Patch('processed/:id')
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

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Harvest deleted' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.remove(id);
  }

  @Delete('processed/:id')
  @ApiResponse({ status: 200, description: 'Processed harvest deleted' })
  @ApiResponse({ status: 404, description: 'Processed harvest not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  removeHarvestProcessed(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.removeHarvestProcessed(id);
  }
}
