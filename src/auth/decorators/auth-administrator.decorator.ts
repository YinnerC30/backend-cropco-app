import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export function AuthAdministration() {
  return applyDecorators(UseGuards(AuthGuard('jwt-administration')));
}
