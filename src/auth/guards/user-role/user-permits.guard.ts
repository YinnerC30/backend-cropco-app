import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { UserActions } from 'src/users/entities/user-actions.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserPermitsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();
    const userRequest = req.user as User;
    const pathEndPoint = req.originalUrl;
    console.log(pathEndPoint);

    const { actions, id } = userRequest;

    // TODO: Refactorizar este codigo
    const tienePermiso = actions.some((module: any) => {
      const { actions } = module;
      console.log(actions);
      const tienePermiso2 = actions.some((item: any) => {
        console.log(item.path_endpoint === pathEndPoint);
        return '/' + item.path_endpoint === pathEndPoint;
      });
      return tienePermiso2;
    });

    if (tienePermiso) {
      return true;
    }

    if (!userRequest) throw new BadRequestException('User not found');

    throw new ForbiddenException(
      `User ${userRequest.first_name} need a permit for this action`,
    );
  }
}
