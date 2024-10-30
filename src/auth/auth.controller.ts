import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PathsController } from 'src/common/interfaces/PathsController';
import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { CheckAuthStatusDto } from './dto/check-status.dto';
import { LoginUserDto } from './dto/login-user.dto';

export const pathsAuthController: PathsController = {
  login: { path: 'login', description: 'login usuario', name: 'login_user' },
  renewToken: {
    path: 'renew-token',
    description: 'renovar jwt del usuario',
    name: 'renew_token',
  },
  checkAuthStatus: {
    path: 'check-status',
    description: 'verificar estado del token',
    name: 'check_status_token',
  },
  createModuleActions: {
    path: 'module-actions/create',
    description: 'crear acciones de los modulos',
    name: 'create_module_actions',
  },
  findAllModules: {
    path: 'modules/all',
    description: 'obtener todos los modulos del sistema',
    name: 'find_all_modules',
  },
  findOneModule: {
    path: 'modules/one/:name',
    description: 'obtener un modulo del sistema',
    name: 'find_one_module',
  },
  convertToAdmin: {
    path: 'convert-to-admin/one/:id',
    description: 'otorgar todos los permisos al usuario',
    name: 'convert_to_admin',
  },
};

const {
  login,
  renewToken,
  checkAuthStatus,
  findAllModules,
  createModuleActions,
  findOneModule,
  convertToAdmin,
} = pathsAuthController;

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post(login.path)
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Post(renewToken.path)
  @Auth()
  @HttpCode(200)
  renewToken(@Body() token: CheckAuthStatusDto) {
    return this.authService.renewToken(token);
  }

  @Post(checkAuthStatus.path)
  checkAuthStatus(@Body() token: CheckAuthStatusDto) {
    return this.authService.checkAuthStatus(token);
  }
  @Get(createModuleActions.path)
  createModuleWithActions() {
    return this.authService.createModuleWithActions();
  }

  @Get(findAllModules.path)
  findAllModules() {
    return this.authService.findAllModules();
  }

  @Get(findOneModule.path)
  findOneModule(@Param('name') name: string) {
    return this.authService.findOneModule(name);
  }

  @Get(convertToAdmin.path)
  convertToAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.authService.convertToAdmin(id);
  }
}
