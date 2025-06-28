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
  const token = request.cookies['user-token'];

  if (!token) throw new UnauthorizedException('Token not found in request');

  return token;
};

export const GetToken = createParamDecorator(getTokenFactory);
