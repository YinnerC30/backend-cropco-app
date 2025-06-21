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
} from '@nestjs/common';
import { AuthTenant } from 'src/auth/decorators/auth-tenant.decorator';
import { GetPropertyFromTokenAdministrator } from 'src/auth/decorators/get-property-from-administrator-token.decorator';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { ChangePasswordDto } from 'src/users/dto/change-password.dto';
import { AdministratorsService } from './administrators.service';
import { CreateAdministradorDto } from './dto/create-administrator.dto';
import { UpdateAdministradorDto } from './dto/update-administrator.dto';

export const pathsTenantsController: PathsController = {
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
  resetPasswordAdmin: {
    path: 'reset-password/one/admin/:id',
    description: 'restablecimiento de contraseña',
    name: 'reset_password_admin',
  },
  changePasswordAdmin: {
    path: 'change-password/one/admin',
    description: 'cambio de contraseña',
    name: 'change_password_admin',
  },
  toggleStatusAdmin: {
    path: 'toggle-status/one/admin/:id',
    description: 'cambio de estado de usuario',
    name: 'toggle_status_admin',
  },
};

const {
  createTenantAdmin,
  findAllTenantsAdmins,
  findOneTenantsAdmin,
  updateTenantsAdmin,
  removeTenantsAdmin,
  resetPasswordAdmin,
  changePasswordAdmin,
  toggleStatusAdmin,
} = pathsTenantsController;

@Controller('administrators')
export class AdministratorsController {
  constructor(private readonly administratorsService: AdministratorsService) {}

  // Tenants Administrators
  @AuthTenant()
  @Post(createTenantAdmin.path)
  createAdmin(@Body() tenantAdministradorDto: CreateAdministradorDto) {
    return this.administratorsService.createAdmin(tenantAdministradorDto);
  }

  @AuthTenant()
  @Get(findOneTenantsAdmin.path)
  findOneAdmin(@Param('id') id: string) {
    return this.administratorsService.findOneAdmin(id);
  }

  @AuthTenant()
  @Get(findAllTenantsAdmins.path)
  findAllAdmin(@Query() queryParams: QueryParamsDto) {
    return this.administratorsService.findAllAdmin(queryParams);
  }

  @AuthTenant()
  @Patch(updateTenantsAdmin.path)
  updateAdmin(
    @Param('id') id: string,
    @Body() tenantAdministradorDto: UpdateAdministradorDto,
  ) {
    return this.administratorsService.updateAdmin(id, tenantAdministradorDto);
  }

  @AuthTenant()
  @Delete(removeTenantsAdmin.path)
  removeAdmin(@Param('id') id: string) {
    return this.administratorsService.removeAdmin(id);
  }

  @AuthTenant()
  @Put(toggleStatusAdmin.path)
  toggleStatusAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.administratorsService.toggleStatusAdmin(id);
  }

  @AuthTenant()
  @Put(resetPasswordAdmin.path)
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.administratorsService.resetPassword(id);
  }

  @AuthTenant()
  @Put(changePasswordAdmin.path)
  changePassword(
    @GetPropertyFromTokenAdministrator('id', ParseUUIDPipe) id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.administratorsService.changePassword(id, changePasswordDto);
  }
}
