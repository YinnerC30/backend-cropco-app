import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantConnectionService } from '../services/tenant-connection.service';

@Injectable()
export class TenantConnectionInterceptor implements NestInterceptor {
  constructor(private readonly tenantConnectionService: TenantConnectionService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];

    if (tenantId) {
      const connection = await this.tenantConnectionService.getTenantConnection(
        tenantId,
      );
      request.tenantConnection = connection;
    }

    return next.handle();
  }
} 