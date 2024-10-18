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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';
import { QueryParams } from 'src/common/dto/QueryParams';
import { PathsController } from 'src/common/interfaces/PathsController';

export const pathsSuppliersController: PathsController = {
  createSupplier: { path: 'create', description: 'crear proveedor' },
  findAllSuppliers: { path: 'all', description: 'obtener todos los proveedores' },
  findOneSupplier: { path: 'one/:id', description: 'obtener 1 proveedor' },
  updateSupplier: { path: 'update/one/:id', description: 'actualizar 1 proveedor' },
  removeSupplier: { path: 'remove/one/:id', description: 'eliminar 1 proveedor' },
};

const {
  createSupplier,
  findAllSuppliers,
  findOneSupplier,
  updateSupplier,
  removeSupplier,
} = pathsSuppliersController;

@ApiTags('Suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post(createSupplier.path)
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({
    status: 201,
    description: 'The supplier has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get(findAllSuppliers.path)
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiResponse({ status: 200, description: 'Return all suppliers.' })
  @ApiQuery({ type: QueryParams })
  findAll(@Query() queryParams: QueryParams) {
    return this.suppliersService.findAll(queryParams);
  }

  @Get(findOneSupplier.path)
  @ApiOperation({ summary: 'Get a supplier by id' })
  @ApiResponse({ status: 200, description: 'Return the supplier.' })
  @ApiResponse({ status: 404, description: 'Supplier not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Supplier id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(updateSupplier.path)
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiResponse({
    status: 200,
    description: 'The supplier has been successfully updated.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 404, description: 'Supplier not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Supplier id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(removeSupplier.path)
  @ApiOperation({ summary: 'Delete a supplier' })
  @ApiResponse({
    status: 200,
    description: 'The supplier has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Supplier not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Supplier id' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.remove(id);
  }
}
