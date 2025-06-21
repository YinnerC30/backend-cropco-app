import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AuthAdministration } from 'src/auth/decorators/auth-administrator.decorator';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

export const pathsTenantsController: PathsController = {
  create: {
    path: 'create',
    description: 'Crear inquilino en el sistema',
    name: 'create_tenant',
    visibleToUser: false,
  },
  findAllTenants: {
    path: 'all',
    description: 'obtener todos los inquilinos',
    name: 'find_all_tenants',
  },
  findOneTenant: {
    path: 'one/:id',
    description: 'obtener 1 inquilino',
    name: 'find_one_tenant',
  },
  findOneBySubdomain: {
    path: 'one/find/:TenantSubdomain',
    description: 'obtener 1 inquilino por subdominio',
    name: 'find_one_by_subdomain',
  },
  updateTenant: {
    path: 'update/one/:id',
    description: 'actualizar 1 inquilino',
    name: 'update_one_tenant',
  },
  toggleStatusTenant: {
    path: 'toggle-status/one/:id',
    description: 'cambiar el estado de 1 inquilino',
    name: 'toggle_status_one_tenant',
  },
  removeTenant: {
    path: 'remove/one/:id',
    description: 'eliminar 1 inquilino',
    name: 'remove_one_tenant',
  },
  // configDataBaseTenant: {
  //   path: 'config-db/one/:id',
  //   description: 'configurar base de datos de 1 inquilino',
  //   name: 'config_data_base_tenant',
  // },
};

const {
  create,
  findAllTenants,
  findOneTenant,
  findOneBySubdomain,
  updateTenant,
  toggleStatusTenant,
  removeTenant,
  // configDataBaseTenant,
} = pathsTenantsController;

// @AuthTenant()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @AuthAdministration()
  @Post(create.path)
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @AuthAdministration()
  @Get(findAllTenants.path)
  findAll(@Query() queryParams: QueryParamsDto) {
    return this.tenantsService.findAll(queryParams);
  }

  @AuthAdministration()
  @Get(findOneTenant.path)
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Get(findOneBySubdomain.path)
  findOneBySubdomain(@Param('TenantSubdomain') subdomain: string) {
    return this.tenantsService.findOneBySubdomain(subdomain);
  }

  @AuthAdministration()
  @Put(updateTenant.path)
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @AuthAdministration()
  @Patch(toggleStatusTenant.path)
  toggleStatusTenant(@Param('id') id: string) {
    return this.tenantsService.toggleStatusTenant(id);
  }

  @AuthAdministration()
  @Delete(removeTenant.path)
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }
}
