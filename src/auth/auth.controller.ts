import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PathsController } from 'src/common/interfaces/PathsController';
import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { CheckAuthStatusDto } from './dto/check-status.dto';
import { LoginUserDto } from './dto/login-user.dto';

export const pathsAuthController: PathsController = {
  login: { path: 'login', name: 'login usuario' },
  renewToken: {
    path: 'renew-token',
    name: 'renovar jwt del usuario',
  },
  checkAuthStatus: {
    path: 'check-status',
    name: 'verificar estado del token',
  },
  createModuleActions: {
    path: 'module-actions/create',
    name: 'crear acciones de los modulos',
  },
  findAllModules: {
    path: 'modules/all',
    name: 'obtener todos los modulos del sistema',
  },
};

const {
  login,
  renewToken,
  checkAuthStatus,
  findAllModules,
  createModuleActions,
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
}
