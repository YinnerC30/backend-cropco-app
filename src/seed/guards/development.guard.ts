import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DevelopmentGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const statusProject = this.configService.get<string>('STATUS_PROJECT') || 'development';
    return statusProject === 'development';
  }
} 