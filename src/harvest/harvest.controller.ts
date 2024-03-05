import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { HarvestService } from './harvest.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('harvest')
export class HarvestController {
  constructor(private readonly harvestService: HarvestService) {}

  @Post()
  create(@Body() createHarvestDto: CreateHarvestDto) {
    return this.harvestService.create(createHarvestDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.harvestService.findAll(paginationDto);
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.harvestService.findOne(id);
  }
  /* 

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHarvestDto: UpdateHarvestDto) {
    return this.harvestService.update(+id, updateHarvestDto);
  }
*/
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.harvestService.remove(id);
  }
}
