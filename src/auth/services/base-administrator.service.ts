import { Inject, Injectable, Logger } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Administrator } from 'src/administrators/entities/administrator.entity';

@Injectable()
export abstract class BaseAdministratorService {
  protected logger: Logger;

  constructor(@Inject(REQUEST) protected readonly request: Request) {
    this.logger = new Logger('BaseAdministratorService');
  }

  private get currentAdministrator(): Administrator | undefined {
    return this.request.user as Administrator;
  }

  protected setLogger(logger: Logger): void {
    this.logger = logger;
  }

  protected logWithContext(
    message: string,
    level: 'log' | 'warn' | 'error' = 'log',
  ): void {
    const contextMessage = `[User: ${this.currentAdministrator?.email || 'system'}] ${message}`;
    this.logger[level](contextMessage);
  }
}
