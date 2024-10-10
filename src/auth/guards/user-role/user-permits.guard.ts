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
import { ModuleActions } from 'src/auth/entities/module-actions.entity';
import { Module } from 'src/auth/entities/module.entity';
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

    // Obtener usuario
    const userRequest = req.user as User as any;
    // Obtener path solicitado
    const pathEndPoint = req.route.path;

    // Validar si el usuario tiene acceso a esa ruta
    const { modules: modulesUser } = userRequest;

    const actionsUser = modulesUser
      .map((item: any) => item.actions.map((i: any) => i.path_endpoint))
      .flat(1);

    console.log(actionsUser, pathEndPoint);

    const resultValidation = actionsUser.includes(pathEndPoint);

    if (resultValidation) return true;

    if (!userRequest) throw new BadRequestException('User not found');

    throw new ForbiddenException(
      `User ${userRequest.first_name} need a permit for this action`,
    );
  }
}
