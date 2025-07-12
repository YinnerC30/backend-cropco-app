import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard implements CanActivate {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const request = req as Request;

    // Usar IP como identificador base
    let tracker = request.ip || request.socket?.remoteAddress || 'unknown';

    // Si el usuario está autenticado, incluir su ID para rate limiting por usuario
    if (request.user && (request.user as any).id) {
      tracker = `${tracker}:user:${(request.user as any).id}`;
    }

    // Si es un tenant específico, incluir el tenant ID
    const tenantId = request.headers['x-tenant-id'] as string;
    if (tenantId) {
      tracker = `${tracker}:tenant:${tenantId}`;
    }

    return tracker;
  }
}
