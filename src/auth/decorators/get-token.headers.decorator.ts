import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const getTokenFactory = (
  _: unknown,
  ctx: ExecutionContext,
): string | null => {
  const request = ctx.switchToHttp().getRequest();
  const authorization =
    request.headers['authorization'] || request.headers['Authorization'];

  if (!authorization)
    throw new UnauthorizedException('Token not found in request');

  // El encabezado de autorización debería comenzar con 'Bearer '
  const [bearer, token] = authorization.split(' ');

  if (bearer !== 'Bearer' || !token)
    throw new UnauthorizedException('Token not found in request');

  return token;
};

export const GetToken = createParamDecorator(getTokenFactory);
