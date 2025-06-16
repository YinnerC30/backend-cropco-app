import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantConnectionService } from '../services/tenant-connection.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantsConnectionService: TenantConnectionService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (tenantId) {
      try {
        const tenantConnection =
          await this.tenantsConnectionService.getTenantConnection(tenantId);
        req['tenantConnection'] = tenantConnection;
      } catch (error) {
        // Si no se encuentra el tenant, continuamos sin conexión específica
        console.error(`Error getting tenant connection: ${error.message}`);
      }
    }

    next();
  }
}
