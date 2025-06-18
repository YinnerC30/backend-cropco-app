import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { AuthTenant } from 'src/auth/decorators/auth-tenant.decorator';
import { PathsController } from 'src/common/interfaces/PathsController';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantAdministradorDto } from './dto/tenant-administrator.dto';
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
  removeTenant: {
    path: 'remove/one/:id',
    description: 'eliminar 1 inquilino',
    name: 'remove_one_tenant',
  },
  createTenantAdmin: {
    path: 'create/one/admin',
    description: 'Crear usuario capaz de manipular los inquilinos',
    name: 'create_tenant_admin',
    visibleToUser: false,
  },
  findAllTenantsAdmins: {
    path: 'all/admin',
    description: 'obtener todos los usuarios administradores de inquilinos',
    name: 'find_all_tenants_admins',
  },
  findOneTenantsAdmin: {
    path: 'one/admin/:id',
    description: 'obtener 1 administrador de inquilinos',
    name: 'find_one_tenants_admin',
  },
  updateTenantsAdmin: {
    path: 'update/one/admin/:id',
    description: 'actualizar 1 administrador de inquilinos',
    name: 'update_one_tenants_admin',
  },
  removeTenantsAdmin: {
    path: 'remove/one/admin/:id',
    description: 'eliminar 1 administrador de inquilinos',
    name: 'remove_one_tenants_admin',
  },
};

const {
  create,
  findAllTenants,
  findOneTenant,
  findOneBySubdomain,
  updateTenant,
  removeTenant,
  createTenantAdmin,
  findAllTenantsAdmins,
  findOneTenantsAdmin,
  updateTenantsAdmin,
  removeTenantsAdmin,
} = pathsTenantsController;

@AuthTenant()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post(create.path)
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Post(createTenantAdmin.path)
  createAdmin(@Body() tenantAdministradorDto: TenantAdministradorDto) {
    return this.tenantsService.createAdmin(tenantAdministradorDto);
  }

  @Get(findAllTenants.path)
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(findAllTenantsAdmins.path)
  findAllAdmin() {
    return this.tenantsService.findAllAdmin();
  }

  @Get(findOneTenant.path)
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Get(findOneTenantsAdmin.path)
  findOneAdmin(@Param('id') id: string) {
    return this.tenantsService.findOneAdmin(id);
  }

  @Get(findOneBySubdomain.path)
  findOneBySubdomain(@Param('TenantSubdomain') subdomain: string) {
    return this.tenantsService.findOneBySubdomain(subdomain);
  }

  // @Get('one/connection-db/:id')
  // findOneConnectionDB(@Param('id') id: string) {
  //   return this.tenantsService.getOneTenantConfigDB(id);
  // }

  @Put(updateTenant.path)
  configDataBaseTanent(@Param('id') id: string) {
    return this.tenantsService.configDataBaseTenant(id);
  }

  @Patch(updateTenant.path)
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(removeTenant.path)
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  @Delete(removeTenantsAdmin.path)
  removeAdmin(@Param('id') id: string) {
    return this.tenantsService.removeAdmin(id);
  }

  // @Get(':id/users')
  // getTenantUsers(@Param('id') id: string) {
  //   return this.tenantsService.getTenantUsers(id);
  // }

  // @Post(':id/users')
  // addUserToTenant(
  //   @Param('id') id: string,
  //   @Body() body: { userId: string; role: string },
  // ) {
  //   return this.tenantsService.addUserToTenant(id, body.userId, body.role);
  // }
}
