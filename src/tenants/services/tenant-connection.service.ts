import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantsService } from '../tenants.service';

@Injectable()
export class TenantConnectionService {
  private tenantConnections: Map<string, DataSource> = new Map();

  constructor(
    @Inject(forwardRef(() => TenantsService))
    private readonly tenantsService: TenantsService,
  ) {}

  async getTenantConnection(tenantId: string): Promise<DataSource> {
    if (!this.tenantConnections.has(tenantId)) {
      const connectionConfig =
        await this.tenantsService.getOneTenantConfigDB(tenantId);

      const dataSource = new DataSource({
        type: 'postgres',
        host: connectionConfig.host,
        port: connectionConfig.port,
        username: connectionConfig.username,
        password: connectionConfig.password,
        database: connectionConfig.database,
        entities: [__dirname + '/../../**/!(*tenant*).entity{.ts,.js}'],
        synchronize: true,
      });

      await dataSource.initialize();

      this.tenantConnections.set(tenantId, dataSource);
    }

    return this.tenantConnections.get(tenantId);
  }

  async configDataBaseTenant(tenantId: string) {
    const connectionConfig =
      await this.tenantsService.getOneTenantConfigDB(tenantId);

    const dataSource = new DataSource({
      type: 'postgres',
      host: connectionConfig.host,
      port: connectionConfig.port,
      username: connectionConfig.username,
      password: connectionConfig.password,
      database: connectionConfig.database,
      entities: [__dirname + '/../../**/!(*tenant*).entity{.ts,.js}'],
      synchronize: true,
    });

    await dataSource.initialize();
    await dataSource.destroy();
    return {
      msg: 'Base de datos lista',
    };
  }

  async closeTenantConnection(tenantId: string): Promise<void> {
    const connection = this.tenantConnections.get(tenantId);
    if (connection) {
      await connection.destroy();
      this.tenantConnections.delete(tenantId);
    }
  }

  async closeAllConnections(): Promise<void> {
    for (const [tenantId] of this.tenantConnections.entries()) {
      await this.closeTenantConnection(tenantId);
    }
  }
}
