import {
  BadRequestException,
  Injectable,
  NestMiddleware
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantConnectionService } from '../services/tenant-connection.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantsConnectionService: TenantConnectionService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      throw new BadRequestException('No finding x-tenant-id in headers');
    }

    try {
      if (tenantId) {
        const tenantConnection =
          await this.tenantsConnectionService.getTenantConnection(tenantId);
        req['tenantConnection'] = tenantConnection;
      }
    } catch (error) {
      throw error
    }

    next();
  }
}
