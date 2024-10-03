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

export const pathsClientsController: PathsController = {
  create: { path: 'create', name: 'crear cliente' },
  findAll: {
    path: 'all',
    name: 'obtener todos los clientes',
  },
  findOne: {
    path: 'one/:id',
    name: 'obtener 1 cliente',
  },
  update: {
    path: 'update/one/:id',
    name: 'actualizar 1 cliente',
  },
  remove: {
    path: 'delete/one/:id',
    name: 'eliminar 1 cliente',
  },
};

@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // Crear cliente
  @Post(pathsClientsController.create.path)
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
  @Get(pathsClientsController.findAll.path)
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

  // Obtener información de 1 cliente
  @Get(pathsClientsController.findOne.path)
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
  @Patch(pathsClientsController.update.path)
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
  @Delete(pathsClientsController.remove.path)
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
}
