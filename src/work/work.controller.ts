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
import { ApiTags } from '@nestjs/swagger';
import { QueryParamsWork } from './dto/query-params-work.dto';
import { PathsController } from 'src/common/interfaces/PathsController';

export const pathsWorksController: PathsController = {
  createWork: { path: 'create', name: 'crear trabajo' },
  getAll: { path: 'all', name: 'obtener todos los trabajos' },
  getOneWork: { path: 'one/:id', name: 'obtener 1 trabajo' },
  updateWork: { path: 'update/:id', name: 'actualizar 1 trabajo' },
  deleteWork: { path: 'delete/:id', name: 'eliminar 1 trabajo' },
};

@ApiTags('Works')
@Controller('works')
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @Post('create')
  create(@Body() createWorkDto: CreateWorkDto) {
    return this.workService.create(createWorkDto);
  }

  @Get('all')
  findAll(@Query() queryParams: QueryParamsWork) {
    return this.workService.findAll(queryParams);
  }
  @Get('one/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workService.findOne(id);
  }

  @Patch('update/one/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkDto: UpdateWorkDto,
  ) {
    return this.workService.update(id, updateWorkDto);
  }

  @Delete('delete/one/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.workService.remove(id);
  }
}
