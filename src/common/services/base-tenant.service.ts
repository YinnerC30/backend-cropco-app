import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { User } from 'src/users/entities/user.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export abstract class BaseTenantService {
  protected currentTenantId: string;
  protected currentUser: User | undefined;
  protected tenantConnection: DataSource;

  constructor(@Inject(REQUEST) protected readonly request: Request) {
    this.currentTenantId = this.request.headers['x-tenant-id'] as string;
    this.currentUser = this.request.user as User;
    this.tenantConnection = this.request['tenantConnection'];
  }

  protected getTenantRepository<T>(entity: any): Repository<T> {
    if (!this.tenantConnection) {
      throw new Error('Tenant connection not available');
    }
    return this.tenantConnection.getRepository(entity);
  }

  protected logWithContext(
    message: string,
    level: 'log' | 'warn' | 'error' = 'log',
  ): void {
    const contextMessage = `[Tenant: ${this.currentTenantId}] [User: ${this.currentUser?.email || 'system'}] ${message}`;
    console[level](contextMessage);
  }
}
