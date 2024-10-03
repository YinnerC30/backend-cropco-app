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
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { QueryParams } from 'src/common/dto/QueryParams';
import { CropsService } from './crops.service';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { Crop } from './entities/crop.entity';

@ApiTags('Crops')
@Controller('crops')
@Auth()
export class CropsController {
  constructor(private readonly cropsService: CropsService) {}

  // Crear cultivo

  @Post('create')
  // Documentación
  @ApiOperation({ summary: 'Crear un nuevo cultivo' })
  @ApiCreatedResponse({ description: 'Cultivo creado', type: Crop })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido' })
  @ApiResponse({ status: 409, description: 'Conflicto' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  create(@Body() createCropDto: CreateCropDto) {
    return this.cropsService.create(createCropDto);
  }

  // Obtener todos los cultivos
  @Get('all')
  // Documentación
  @ApiOperation({ summary: 'Obtener una lista de todos los cultivos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cultivos obtenida con éxito',
    type: [Crop],
  })
  @ApiResponse({ status: 400, description: 'Datos de consulta inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findAll(@Query() queryParams: QueryParams) {
    return this.cropsService.findAll(queryParams);
  }

  @Get('/with-harvest')
  findAllWithHarvest(@Query() queryParams: QueryParams) {
    return this.cropsService.findAllWithHarvest(queryParams);
  }

  @Get('/with-work')
  findAllWithWork(@Query() queryParams: QueryParams) {
    return this.cropsService.findAllWithWork(queryParams);
  }

  // Obtener 1 cultivo
  @Get('one/:id')
  // Documentación
  @ApiOperation({ summary: 'Obtener los detalles de un cultivo específico' })
  @ApiResponse({
    status: 200,
    description: 'Detalles del cultivo obtenidos con éxito',
    type: Crop,
  })
  @ApiResponse({ status: 400, description: 'Identificador inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido' })
  @ApiResponse({ status: 404, description: 'Cultivo no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cropsService.findOne(id);
  }

  // Actualización de 1 cultivo
  @Patch('update/:id')
  // Documentación
  @ApiOperation({ summary: 'Actualizar los detalles de un cultivo específico' })
  @ApiResponse({
    status: 200,
    description: 'Detalles del cultivo actualizados con éxito',
    type: Crop,
  })
  @ApiResponse({ status: 400, description: 'Datos de actualización inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido' })
  @ApiResponse({ status: 404, description: 'Cultivo no encontrado' })
  @ApiResponse({ status: 409, description: 'Conflicto' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCropDto: UpdateCropDto,
  ) {
    return this.cropsService.update(id, updateCropDto);
  }

  // Eliminación de 1 cultivo
  @Delete('delete/:id')
  // Documentación
  @ApiOperation({ summary: 'Eliminar un cultivo específico' })
  @ApiResponse({ status: 200, description: 'Cultivo eliminado con éxito' })
  @ApiResponse({ status: 400, description: 'Identificador inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido' })
  @ApiResponse({ status: 404, description: 'Cultivo no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cropsService.remove(id);
  }
}
