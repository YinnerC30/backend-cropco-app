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
import { HarvestService } from './harvest.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateHarvestProcessedDto } from './dto/create-harvest-processed.dto';
import { UpdateHarvestProcessedDto } from './dto/update-harvest-processed.dto';

@Controller('harvest')
export class HarvestController {
  constructor(private readonly harvestService: HarvestService) {}

  @Post()
  create(@Body() createHarvestDto: CreateHarvestDto) {
    return this.harvestService.create(createHarvestDto);
  }

  @Post('processed')
  createHarvestProcessed(
    @Body() createHarvestProcessedDto: CreateHarvestProcessedDto,
  ) {
    return this.harvestService.createHarvestProcessed(
      createHarvestProcessedDto,
    );
  }

  @Get('deleteAll')
  deleteAll() {
    return this.harvestService.deleteAllHarvest();
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.harvestService.findAll(paginationDto);
  }

  @Get('processed')
  findAllHarvestProcessed(@Query() paginationDto: PaginationDto) {
    return this.harvestService.findAllHarvestProcessed(paginationDto);
  }
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.findOne(id);
  }

  @Get('processed/:id')
  findOneHarvestProcessed(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.findOneHarvestProcessed(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHarvestDto: UpdateHarvestDto,
  ) {
    return this.harvestService.update(id, updateHarvestDto);
  }

  @Patch('processed/:id')
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
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.remove(id);
  }

  @Delete('processed/:id')
  removeHarvestProcessed(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.removeHarvestProcessed(id);
  }
}
