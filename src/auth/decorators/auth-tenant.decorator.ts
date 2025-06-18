import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export function AuthTenant() {
  return applyDecorators(UseGuards(AuthGuard('jwt-tenant')));
}
