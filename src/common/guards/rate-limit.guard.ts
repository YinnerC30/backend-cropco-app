import { CanActivate, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard implements CanActivate {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const request = req as Request;

    let tracker = request.ip || request.socket?.remoteAddress || 'unknown';

    const cookieUserValue = request.cookies['user-token'];
    const cookieAdminValue = request.cookies['administrator-token'];

    let usertoken: string;
    let userDecodedToken: JwtPayload;
    let userId = '';

    try {
      usertoken = cookieUserValue.split('.')[1];
      userDecodedToken = <JwtPayload>(
        JSON.parse(Buffer.from(usertoken, 'base64').toString())
      );

      userId = userDecodedToken?.['id'] || null;
    } catch (error) {}

    if (!!usertoken) {
      tracker = `${tracker}:user-token:${usertoken}`;
    }

    if (!!userId) {
      tracker = `${tracker}:user-id:${userId}`;
    }

    const tenantId = request.headers['x-tenant-id'] as string;
    if (tenantId && userId) {
      tracker = `${tracker}:tenant-id:${tenantId}`;
    }

    let admintoken: string;
    let adminDecodedToken: JwtPayload;
    let adminId = '';

    try {
      admintoken = cookieAdminValue.split('.')[1];
      adminDecodedToken = <JwtPayload>(
        JSON.parse(Buffer.from(admintoken, 'base64').toString())
      );

      adminId = adminDecodedToken?.['id'] || null;
    } catch (error) {}

    if (!!admintoken) {
      tracker = `${tracker}:administrator-token:${admintoken}`;
    }

    if (!!adminId) {
      tracker = `${tracker}:administrator-id:${adminId}`;
    }

    console.log(tracker);
    return tracker;
  }
}
