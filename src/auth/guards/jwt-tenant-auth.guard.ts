import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtTenantAuthGuard extends AuthGuard('jwt-tenant') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
} 