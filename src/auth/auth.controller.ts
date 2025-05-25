import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { PathsController } from 'src/common/interfaces/PathsController';
import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { GetToken } from './decorators/get-token.headers.decorator';
import { LoginUserDto } from './dto/login-user.dto';

export const pathsAuthController: PathsController = {
  login: {
    path: 'login',
    description: 'login usuario',
    name: 'login_user',
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
  createModuleActions: {
    path: 'module-actions/create',
    description: 'crear acciones de los modulos',
    name: 'create_module_actions',
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
  findAllModules,
  createModuleActions,
  // convertToAdmin,
} = pathsAuthController;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post(login.path)
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Auth()
  @Patch(renewToken.path)
  @HttpCode(200)
  renewToken(@GetToken() token: string) {
    return this.authService.renewToken(token);
  }

  @Auth()
  @Get(checkAuthStatus.path)
  checkAuthStatus(@GetToken() token: string) {
    return this.authService.checkAuthStatus(token);
  }

  @Get(findAllModules.path)
  findAllModules() {
    return this.authService.findAllModules();
  }

  // TODO: Solo en modo de desarrollo
  @Get(createModuleActions.path)
  createModuleWithActions() {
    return this.authService.createModulesWithActions();
  }

  // @Get(convertToAdmin.path)
  // convertToAdmin(@Param('id', ParseUUIDPipe) id: string) {
  //   return this.authService.convertToAdmin(id);
  // }
}
