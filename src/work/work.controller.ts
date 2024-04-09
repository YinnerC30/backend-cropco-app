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
import { CreateWorkDto } from './dto/create-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { WorkService } from './work.service';

@Controller('work')
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @Post()
  create(@Body() createWorkDto: CreateWorkDto) {
    return this.workService.create(createWorkDto);
  }

  @Get()
  findAll(@Query() queryParams: QueryParams) {
    return this.workService.findAll(queryParams);
  }
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkDto: UpdateWorkDto,
  ) {
    return this.workService.update(id, updateWorkDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.workService.remove(id);
  }
}
