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
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { Supplier } from './entities/supplier.entity';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { Response } from 'express';

export const pathsSuppliersController: PathsController = {
  createSupplier: {
    path: 'create',
    description: 'crear proveedor',
    name: 'create_supplier',
  },
  findAllSuppliers: {
    path: 'all',
    description: 'obtener todos los proveedores',
    name: 'find_all_suppliers',
  },
  findAllSuppliersWithShopping: {
    path: 'shopping/all',
    description: 'obtener todos los proveedores con compras',
    name: 'find_all_suppliers_with_shopping',
  },
  findOneSupplier: {
    path: 'one/:id',
    description: 'obtener 1 proveedor',
    name: 'find_one_supplier',
  },
  updateSupplier: {
    path: 'update/one/:id',
    description: 'actualizar 1 proveedor',
    name: 'update_one_supplier',
  },
  removeSupplier: {
    path: 'remove/one/:id',
    description: 'eliminar 1 proveedor',
    name: 'remove_one_supplier',
  },
  removeSuppliers: {
    path: 'remove/bulk',
    description: 'eliminar varios proveedores',
    name: 'remove_bulk_suppliers',
  },
};

const {
  createSupplier,
  findAllSuppliers,
  findOneSupplier,
  updateSupplier,
  removeSupplier,
  removeSuppliers,
  findAllSuppliersWithShopping,
} = pathsSuppliersController;

@Auth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post(createSupplier.path)
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get(findAllSuppliers.path)
  findAll(@Query() queryParams: QueryParamsDto) {
    return this.suppliersService.findAll(queryParams);
  }
  @Get(findAllSuppliersWithShopping.path)
  findAllSuppliersWithShopping() {
    return this.suppliersService.findAllSuppliersWithShopping();
  }

  @Get(findOneSupplier.path)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(updateSupplier.path)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(removeSupplier.path)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.remove(id);
  }

  @Delete(removeSuppliers.path)
  async removeBulk(
    @Body() removeBulkSuppliersDto: RemoveBulkRecordsDto<Supplier>,
    @Res() response: Response,
  ) {
    const result = await this.suppliersService.removeBulk(
      removeBulkSuppliersDto,
    );
    if (result.failed && result.failed.length > 0) {
      return response.status(207).json(result);
    }
    return response.status(200).json(result);
  }
}
