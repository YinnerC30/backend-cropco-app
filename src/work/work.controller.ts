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
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { CreateWorkDto } from './dto/create-work.dto';
import { QueryParamsWork } from './dto/query-params-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { Work } from './entities/work.entity';
import { WorkService } from './work.service';
import { Auth } from 'src/auth/decorators/auth.decorator';

export const pathsWorksController: PathsController = {
  createWork: {
    path: 'create',
    description: 'crear trabajo',
    name: 'create_work',
  },
  findAllWorks: {
    path: 'all',
    description: 'obtener todos los trabajos',
    name: 'find_all_works',
  },
  findOneWork: {
    path: 'one/:id',
    description: 'obtener 1 trabajo',
    name: 'find_one_work',
  },
  updateWork: {
    path: 'update/one/:id',
    description: 'actualizar 1 trabajo',
    name: 'update_one_work',
  },
  removeWork: {
    path: 'remove/one/:id',
    description: 'eliminar 1 trabajo',
    name: 'remove_one_work',
  },
  removeWorks: {
    path: 'remove/bulk',
    description: 'eliminar varios trabajos',
    name: 'remove_bulk_works',
  },
  exportWorkToPDF: {
    path: 'export/one/pdf/:id',
    description: 'exportar trabajo a PDF',
    name: 'export_work_to_pdf',
  },
};

const {
  exportWorkToPDF,
  createWork,
  findAllWorks,
  findOneWork,
  updateWork,
  removeWork,
  removeWorks,
} = pathsWorksController;

@Auth()
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

  @Get(exportWorkToPDF.path)
  async exportWorkToPDF(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const pdfDoc = await this.workService.exportWorkToPDF(id);
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = 'Registro de trabajo';
    pdfDoc.pipe(response);
    pdfDoc.end();
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

  @Delete(removeWorks.path)
  removeBulk(@Body() removeBulkWorksDto: RemoveBulkRecordsDto<Work>) {
    return this.workService.removeBulk(removeBulkWorksDto);
  }
}
