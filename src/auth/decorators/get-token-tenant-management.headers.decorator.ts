import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const getTokenFactoryTenantManagement = (
  _: unknown,
  ctx: ExecutionContext,
): string | null => {
  const request = ctx.switchToHttp().getRequest();
  const token = request.headers['x-tenant-token'];

  if (!token) throw new UnauthorizedException('Token not found in request');

  return token;
};

export const GetTokenTenantManagement = createParamDecorator(
  getTokenFactoryTenantManagement,
);
