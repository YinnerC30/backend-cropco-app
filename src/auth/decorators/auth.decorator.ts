import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { UserPermitsGuard } from '../guards/user-role/user-permits.guard';

export const AUTH_OPTIONS_KEY = 'authOptions';

export function Auth(options?: { skipValidationPath?: boolean }) {
  return applyDecorators(
    SetMetadata(AUTH_OPTIONS_KEY, options),
    UseGuards(AuthGuard('jwt'), UserPermitsGuard),
  );
}
