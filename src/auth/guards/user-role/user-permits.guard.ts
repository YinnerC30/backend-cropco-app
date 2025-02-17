import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class UserPermitsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();

    // Obtener usuario
    const userRequest = req.user as User as any;

    if (!userRequest) throw new BadRequestException('User not found');
    // Obtener path solicitado
    const pathEndPoint = req.route.path;

    // Validar si el usuario tiene acceso a esa ruta
    const { modules: modulesUser } = userRequest;

    const actionsUser = modulesUser
      .map((item: any) => item.actions.map((i: any) => i.path_endpoint))
      .flat(1);

    const resultValidation = actionsUser.includes(pathEndPoint);

    if (resultValidation) return true;

    throw new ForbiddenException(
      `User ${userRequest.first_name} need a permit for this action`,
    );
  }
}
