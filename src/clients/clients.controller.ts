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
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { QueryParams } from '../common/dto/QueryParams';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { PathsController } from 'src/common/interfaces/PathsController';
import { Response } from 'express';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { QueryForYear } from 'src/common/dto/QueryForYear';

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
  findTopClientsInSales: {
    path: 'find/top-clients-in-sales',
    description: 'Obtener los 5 clientes con mayores ventas en el año',
    name: 'find_top_clients_in_sales',
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
  findTopClientsInSales,
} = pathsClientsController;

@Auth()
@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get(findTopClientsInSales.path)
  async findTopClientsInSales(@Query() params: QueryForYear) {
    return this.clientsService.findTopClientsInSales(params);
  }

  @Get('export/test')
  async exportTest(@Res() response: Response) {
    const pdfDoc = await this.clientsService.exportTest();

    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = 'Mi primer PDF';
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  @Get(exportClients.path)
  async exportAllClients(@Res() response: Response) {
    const pdfDoc = await this.clientsService.exportAllClients();
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = 'Listado de clientes';
    pdfDoc.pipe(response);
    pdfDoc.end();
  }

  // Crear cliente
  @Post(createClient.path)
  // Documentación
  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  @ApiBody({ type: CreateClientDto })
  @ApiCreatedResponse({
    description: 'El cliente ha sido creado.',
    type: CreateClientDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido' })
  @ApiResponse({ status: 409, description: 'Conflicto' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  // Obtener todos los clientes
  @Get(findAllClients.path)
  // Documentación
  @ApiOperation({ summary: 'Obtener una lista de todos los clientes' })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes obtenida con éxito.',
    type: [CreateClientDto],
  })
  @ApiResponse({ status: 400, description: 'Datos de consulta inválidos.' })
  // Método
  findAll(@Query() queryParams: QueryParams) {
    return this.clientsService.findAll(queryParams);
  }

  @Get(findAllClientsWithSales.path)
  findAllClientsWithSales() {
    return this.clientsService.findAllClientWithSales();
  }

  // Obtener información de 1 cliente
  @Get(findOneClient.path)
  // Documentación
  @ApiOperation({
    summary: 'Obtener la información de un cliente en especifico',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'El ID único del cliente',
    required: true,
  })
  @ApiOkResponse({
    description: 'Información del cliente obtenida con éxito.',
    type: Client,
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado.' })
  // Método
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.findOne(id);
  }

  // Actualizar información de 1 cliente
  @Patch(updateClient.path)
  // Documentación
  @ApiOperation({ summary: 'Actualizar los detalles de un cliente específico' })
  @ApiBody({ type: CreateClientDto })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'El ID único del cliente',
    required: true,
  })
  @ApiOkResponse({
    description: 'Información del cliente actualizada con éxito.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de actualización inválidos.',
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado.' })
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
  @ApiOperation({ summary: 'Eliminar un cliente específico' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'El ID único del cliente',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Cliente eliminado con éxito.' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.remove(id);
  }

  @Delete(removeClients.path)
  @ApiResponse({
    status: 200,
    description: 'Empleados eliminados exitosamente',
  })
  removeBulk(@Body() removeBulkClientsDto: RemoveBulkRecordsDto<Client>) {
    return this.clientsService.removeBulk(removeBulkClientsDto);
  }
}
