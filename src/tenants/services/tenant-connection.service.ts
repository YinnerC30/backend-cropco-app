import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantsService } from '../tenants.service';

@Injectable()
export class TenantConnectionService {
  private tenantConnections: Map<string, DataSource> = new Map();

  constructor(private readonly tenantsService: TenantsService) {}

  async getTenantConnection(tenantId: string): Promise<DataSource> {
    if (!this.tenantConnections.has(tenantId)) {
      const connectionConfig =
        await this.tenantsService.getTenantConnection(tenantId);
      const dataSource = new DataSource({
        type: 'postgres',
        host: connectionConfig.host,
        port: connectionConfig.port,
        username: connectionConfig.username,
        password: connectionConfig.password,
        database: connectionConfig.database,
        entities: connectionConfig.entities,
        synchronize: connectionConfig.synchronize,
      });
      await dataSource.initialize();
      this.tenantConnections.set(tenantId, dataSource);
    }

    return this.tenantConnections.get(tenantId);
  }

  async closeTenantConnection(tenantId: string): Promise<void> {
    const connection = this.tenantConnections.get(tenantId);
    if (connection) {
      await connection.destroy();
      this.tenantConnections.delete(tenantId);
    }
  }

  async closeAllConnections(): Promise<void> {
    for (const [tenantId, connection] of this.tenantConnections.entries()) {
      await this.closeTenantConnection(tenantId);
    }
  }
}
