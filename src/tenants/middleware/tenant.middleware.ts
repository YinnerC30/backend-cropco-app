import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantsService } from '../tenants.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantsService: TenantsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (tenantId) {
      try {
        const tenantConnection = await this.tenantsService.getOneTenantConfigDB(tenantId);
        req['tenantConnection'] = tenantConnection;
      } catch (error) {
        // Si no se encuentra el tenant, continuamos sin conexión específica
        console.error(`Error getting tenant connection: ${error.message}`);
      }
    }
    
    next();
  }
} 