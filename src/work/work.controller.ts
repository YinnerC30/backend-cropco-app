import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { WorkDto } from './dto/work.dto';
import { QueryParamsWork } from './dto/query-params-work.dto';
import { Work } from './entities/work.entity';
import { WorkService } from './work.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ResponseStatusInterceptor } from 'src/common/interceptors/response-status.interceptor';
import { GetSubdomain } from 'src/common/decorators/get-subdomain.decorator';

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
@Controller('works')
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @Post(createWork.path)
  create(@Body() createWorkDto: WorkDto) {
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
    @GetSubdomain() subdomain: string,
  ) {
    const pdfDoc = await this.workService.exportWorkToPDF(id, subdomain);
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = 'Registro de trabajo';
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  @Put(updateWork.path)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkDto: WorkDto,
  ) {
    return this.workService.update(id, updateWorkDto);
  }

  @Delete(removeWork.path)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.workService.remove(id);
  }

  @Delete(removeWorks.path)
  @UseInterceptors(ResponseStatusInterceptor)
  async removeBulk(@Body() removeBulkWorksDto: RemoveBulkRecordsDto<Work>) {
    return this.workService.removeBulk(removeBulkWorksDto);
  }
}
