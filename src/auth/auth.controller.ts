import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { LoginUserDto } from './dto/login-user.dto';
import { CheckAuthStatusDto } from './dto/check-status.dto';
import { PathsController } from 'src/common/interfaces/PathsController';

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
};

const { login, renewToken, checkAuthStatus } = pathsAuthController;

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
  @Get('module-actions')
  createModuleWithActions() {
    return this.authService.createModuleWithActions();
  }

  // @Get('permits')
  // getAllPermits() {
  //   return this.authService.getAllPermits();
  // }
  // @Get('module-permits')
  // getModulePermits() {
  //   return this.authService.getModulePermits();
  // }

  // @Get('user-permits')
  // getUserPermits() {
  //   return this.authService.getUserPermits();
  // }

  // @Get('demo')
  // @Auth()
  // getDemo() {
  //   return { ok: true };
  // }
}
