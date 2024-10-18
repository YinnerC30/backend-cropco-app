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
  createWork: { path: 'create', description: 'crear trabajo' },
  findAllWorks: { path: 'all', description: 'obtener todos los trabajos' },
  findOneWork: { path: 'one/:id', description: 'obtener 1 trabajo' },
  updateWork: { path: 'update/:id', description: 'actualizar 1 trabajo' },
  removeWork: { path: 'remove/:id', description: 'eliminar 1 trabajo' },
};

const { createWork, findAllWorks, findOneWork, updateWork, removeWork } =
  pathsWorksController;

@ApiTags('Works')
@Controller('works')
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @Post(createWork.path)
  create(@Body() createWorkDto: CreateWorkDto) {
    return this.workService.create(createWorkDto);
  }

  @Get(findAllWorks.path)
  findAll(@Query() queryParams: QueryParamsWork) {
    return this.workService.findAll(queryParams);
  }
  @Get(findOneWork.path)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workService.findOne(id);
  }

  @Patch(updateWork.path)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkDto: UpdateWorkDto,
  ) {
    return this.workService.update(id, updateWorkDto);
  }

  @Delete(removeWork.path)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.workService.remove(id);
  }
}
