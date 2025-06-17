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
  UseInterceptors,
} from '@nestjs/common';

import { Response } from 'express';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { QueryParamsDto } from '../common/dto/query-params.dto';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ResponseStatusInterceptor } from 'src/common/interceptors/response-status.interceptor';

export const pathsClientsController: PathsController = {
  createClient: {
    path: 'create',
    description: 'crear cliente',
    name: 'create_client',
  },
  findAllClients: {
    path: 'all',
    description: 'obtener todos los clientes',
    name: 'find_all_clients',
  },
  findAllClientsWithSales: {
    path: 'sales/all',
    description: 'obtener todos los clientes con ventas',
    name: 'find_all_clients_with_sales',
  },
  findOneClient: {
    path: 'one/:id',
    description: 'obtener 1 cliente',
    name: 'find_one_client',
  },
  updateClient: {
    path: 'update/one/:id',
    description: 'actualizar 1 cliente',
    name: 'update_one_client',
  },
  removeClient: {
    path: 'remove/one/:id',
    description: 'eliminar 1 cliente',
    name: 'remove_one_client',
  },
  removeClients: {
    path: 'remove/bulk',
    description: 'eliminar varios clientes',
    name: 'remove_bulk_clients',
  },
  exportClients: {
    path: 'export/all/pdf',
    description: 'exportar clientes a PDF',
    name: 'export_clients_pdf',
  },
};

const {
  createClient,
  findAllClients,
  findAllClientsWithSales,
  findOneClient,
  updateClient,
  removeClient,
  removeClients,
  exportClients,
} = pathsClientsController;

@Auth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get(exportClients.path)
  async exportAllClients(@Res() response: Response) {
    const pdfDoc = await this.clientsService.exportAllClients();
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  // Crear cliente
  @Post(createClient.path)
  // Documentación

  // Método
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  // Obtener todos los clientes
  @Get(findAllClients.path)
  // Documentación

  // Método
  findAll(@Query() queryParams: QueryParamsDto) {
    return this.clientsService.findAll(queryParams);
  }

  @Get(findAllClientsWithSales.path)
  findAllClientsWithSales() {
    return this.clientsService.findAllClientWithSales();
  }

  // Obtener información de 1 cliente
  @Get(findOneClient.path)
  // Documentación

  // Método
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.findOne(id);
  }

  // Actualizar información de 1 cliente
  @Patch(updateClient.path)
  // Documentación

  // Método
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, updateClientDto);
  }

  // Eliminar información de 1 cliente
  @Delete(removeClient.path)
  // Documentación
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.remove(id);
  }

  @Delete(removeClients.path)
  @UseInterceptors(ResponseStatusInterceptor)
  async removeBulk(@Body() removeBulkClientsDto: RemoveBulkRecordsDto<Client>) {
    return this.clientsService.removeBulk(removeBulkClientsDto);
  }
}
