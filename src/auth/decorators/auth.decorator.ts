import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { UserPermitsGuard } from '../guards/user-role/user-permits.guard';

export function Auth() {
  return applyDecorators(UseGuards(AuthGuard('jwt'), UserPermitsGuard));
}
