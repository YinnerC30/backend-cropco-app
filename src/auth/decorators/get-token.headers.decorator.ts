import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

export const GetToken = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    const authorization =
      request.headers['authorization'] || request.headers['Authorization'];

    if (!authorization)
      throw new ForbiddenException('User not authorized for this action');

    // El encabezado de autorización debería comenzar con 'Bearer '
    const [bearer, token] = authorization.split(' ');

    if (bearer !== 'Bearer' || !token)
      throw new ForbiddenException('User not authorized for this action');

    return token;
  },
);
