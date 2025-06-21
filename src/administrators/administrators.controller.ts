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
import { AuthAdministration } from 'src/auth/decorators/auth-administrator.decorator';
import { GetPropertyFromTokenAdministrator } from 'src/auth/decorators/get-property-from-administrator-token.decorator';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { ChangePasswordDto } from 'src/users/dto/change-password.dto';
import { AdministratorsService } from './administrators.service';
import { CreateAdministradorDto } from './dto/create-administrator.dto';
import { UpdateAdministradorDto } from './dto/update-administrator.dto';

export const pathsTenantsController: PathsController = {
  createTenantAdmin: {
    path: 'create/one',
    description: 'Crear usuario capaz de manipular los inquilinos',
    name: 'create_tenant_admin',
    visibleToUser: false,
  },
  findAllTenantsAdmins: {
    path: 'all',
    description: 'obtener todos los usuarios administradores de inquilinos',
    name: 'find_all_tenants_admins',
  },
  findOneTenantsAdmin: {
    path: 'one/:id',
    description: 'obtener 1 administrador de inquilinos',
    name: 'find_one_tenants_admin',
  },
  updateTenantsAdmin: {
    path: 'update/one/:id',
    description: 'actualizar 1 administrador de inquilinos',
    name: 'update_one_tenants_admin',
  },
  removeTenantsAdmin: {
    path: 'remove/one/:id',
    description: 'eliminar 1 administrador de inquilinos',
    name: 'remove_one_tenants_admin',
  },
  resetPasswordAdmin: {
    path: 'reset-password/one/:id',
    description: 'restablecimiento de contraseña',
    name: 'reset_password_admin',
  },
  changePasswordAdmin: {
    path: 'change-password/one',
    description: 'cambio de contraseña',
    name: 'change_password_admin',
  },
  toggleStatusAdmin: {
    path: 'toggle-status/one/:id',
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
  @AuthAdministration()
  @Post(createTenantAdmin.path)
  createAdmin(@Body() tenantAdministradorDto: CreateAdministradorDto) {
    return this.administratorsService.createAdmin(tenantAdministradorDto);
  }

  @AuthAdministration()
  @Get(findOneTenantsAdmin.path)
  findOneAdmin(@Param('id') id: string) {
    return this.administratorsService.findOneAdmin(id);
  }

  @AuthAdministration()
  @Get(findAllTenantsAdmins.path)
  findAllAdmin(@Query() queryParams: QueryParamsDto) {
    return this.administratorsService.findAllAdmin(queryParams);
  }

  @AuthAdministration()
  @Patch(updateTenantsAdmin.path)
  updateAdmin(
    @Param('id') id: string,
    @Body() tenantAdministradorDto: UpdateAdministradorDto,
  ) {
    return this.administratorsService.updateAdmin(id, tenantAdministradorDto);
  }

  @AuthAdministration()
  @Delete(removeTenantsAdmin.path)
  removeAdmin(@Param('id') id: string) {
    return this.administratorsService.removeAdmin(id);
  }

  @AuthAdministration()
  @Put(toggleStatusAdmin.path)
  toggleStatusAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.administratorsService.toggleStatusAdmin(id);
  }

  @AuthAdministration()
  @Put(resetPasswordAdmin.path)
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.administratorsService.resetPassword(id);
  }

  @AuthAdministration()
  @Put(changePasswordAdmin.path)
  changePassword(
    @GetPropertyFromTokenAdministrator('id', ParseUUIDPipe) id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.administratorsService.changePassword(id, changePasswordDto);
  }
}
