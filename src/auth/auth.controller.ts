import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { PathsController } from 'src/common/interfaces/PathsController';
import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { GetToken } from './decorators/get-token.headers.decorator';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthAdministratorService } from './services/auth-administrator.service';
import { AuthAdministration } from './decorators/auth-administrator.decorator';
import { GetTokenAdministration } from './decorators/get-token-administrator.headers.decorator';
import { Response } from 'express';
import { User } from 'src/users/entities/user.entity';
import { Module } from './entities/module.entity';
import { DevelopmentGuard } from 'src/seed/guards/development.guard';

export const pathsAuthController: PathsController = {
  login: {
    path: 'login',
    description: 'login usuario',
    name: 'login_user',
    visibleToUser: false,
  },
  loginManagement: {
    path: 'management/login',
    description: 'login usuario administrador cropco',
    name: 'login_user_management',
    visibleToUser: false,
  },
  renewToken: {
    path: 'renew-token',
    description: 'renovar jwt del usuario',
    name: 'renew_token',
    visibleToUser: false,
  },
  checkAuthStatus: {
    path: 'check-status',
    description: 'verificar estado del token',
    name: 'check_status_token',
    visibleToUser: false,
  },
  checkAuthStatusManagement: {
    path: 'management/check-status',
    description: 'verificar estado del token',
    name: 'check_status_token_management',
    visibleToUser: false,
  },
  createModuleActions: {
    path: 'module-actions/create',
    description: 'crear acciones de los modulos',
    name: 'create_module_actions',
    visibleToUser: false,
  },
  logout: {
    path: 'logout',
    description: 'logout usuario',
    name: 'logout_user',
    visibleToUser: false,
  },
  logoutAdministrator: {
    path: 'management/logout',
    description: 'logout administrador',
    name: 'logout_administrator',
    visibleToUser: false,
  },
  findAllModules: {
    path: 'modules/all',
    description: 'obtener todos los modulos del sistema',
    name: 'find_all_modules',
    visibleToUser: false,
  },
  // convertToAdmin: {
  //   path: 'convert-to-admin/one/:id',
  //   description: 'otorgar todos los permisos al usuario',
  //   name: 'convert_to_admin',
  // },
};

const {
  login,
  renewToken,
  checkAuthStatus,
  checkAuthStatusManagement,
  findAllModules,
  createModuleActions,
  logout,
  logoutAdministrator,
  // convertToAdmin,
  loginManagement,
} = pathsAuthController;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authTenantService: AuthAdministratorService,
  ) {}

  @Post(login.path)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result: any = await this.authService.login(loginUserDto);

    // Establecer la cookie con el token
    response.cookie('user-token', result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 6 * 60 * 60 * 1000, // 6 horas en milisegundos
    });

    delete result.token;

    return result;
  }

  @Post(loginManagement.path)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async loginManagement(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authTenantService.login(loginUserDto);
    // Establecer la cookie  con el token
    response.cookie('administrator-token', result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 6 * 60 * 60 * 1000, // 6 horas en milisegundos
    });

    delete result.token;

    return result;
  }

  @Auth({ skipValidationPath: true })
  @Patch(renewToken.path)
  @HttpCode(200)
  async renewToken(
    @GetToken() token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.renewToken(token);
    response.cookie('user-token', result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 6 * 60 * 60 * 1000, // 6 horas en milisegundos
    });
  }

  @Auth({ skipValidationPath: true })
  @Get(checkAuthStatus.path)
  checkAuthStatus(@GetToken() token: string) {
    return this.authService.checkAuthStatus(token);
  }

  @AuthAdministration()
  @Get(checkAuthStatusManagement.path)
  checkAuthStatusManagement(@GetTokenAdministration() token: string) {
    return this.authTenantService.checkAuthStatus(token);
  }

  @Auth({ skipValidationPath: true })
  @Get(findAllModules.path)
  findAllModules() {
    return this.authService.findAllModules();
  }

  // TODO: Solo en modo de desarrollo
  @Get(createModuleActions.path)
  createModuleWithActions() {
    return this.authService.createModulesWithActions();
  }

  @Auth({ skipValidationPath: true })
  @Post(logout.path)
  @HttpCode(200)
  async logout(
    @GetToken() token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Invalidar el token en el servidor (opcional, depende de tu estrategia)
    await this.authService.logout(token);

    // Limpiar la cookie del cliente
    response.clearCookie('user-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    return { message: 'Logout exitoso' };
  }

  @AuthAdministration()
  @Post(logoutAdministrator.path)
  @HttpCode(200)
  async logoutAdministrator(
    @GetTokenAdministration() token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Invalidar el token en el servidor (opcional, depende de tu estrategia)
    // await this.authService.logout(token);

    // Limpiar la cookie del cliente
    response.clearCookie('administrator-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    return { message: 'Logout exitoso' };
  }

  // Only Development
  /**
   * Add a permission to a user.
   * Only for development purposes.
   * @param userId User identifier
   * @param actionName Name of the action to add
   */
  @AuthAdministration()
  @UseGuards(DevelopmentGuard)
  @Post('add-permission/:userId/:actionName')
  async addPermissionToUser(
    @Param('userId') userId: string,
    @Param('actionName') actionName: string,
  ): Promise<string> {
    return this.authService.addPermission(userId, actionName);
  }

  /**
   * Remove all permissions from a user for a specific module.
   * Only for development purposes.
   * @param userId User identifier
   * @param moduleName Name of the module
   */
  @AuthAdministration()
  @UseGuards(DevelopmentGuard)
  @Post('remove-permissions-to-module/:userId/:moduleName')
  async removePermissionsToModule(
    @Param('userId') userId: string,
    @Param('moduleName') moduleName: string,
  ): Promise<void> {
    return this.authService.removePermissionsToModule(userId, moduleName);
  }

  /**
   * Remove a permission from a user.
   * Only for development purposes.
   * @param userId User identifier
   * @param actionName Name of the action to remove
   */
  @AuthAdministration()
  @UseGuards(DevelopmentGuard)
  @Post('remove-permission/:userId/:actionName')
  async removePermissionFromUser(
    @Param('userId') userId: string,
    @Param('actionName') actionName: string,
  ) {
    return this.authService.removePermission(userId, actionName);
  }

  /**
   * Delete a test user by ID.
   * Only for development and testing purposes.
   * @param userId User identifier
   */
  @AuthAdministration()
  @UseGuards(DevelopmentGuard)
  @Post('delete-test-user/:userId')
  async deleteTestUser(@Param('userId') userId: string): Promise<void> {
    return this.authService.deleteUserToTests(userId);
  }

  // @Get(convertToAdmin.path)
  // convertToAdmin(@Param('id', ParseUUIDPipe) id: string) {
  //   return this.authService.convertToAdmin(id);
  // }
}
