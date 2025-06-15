import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantsService } from '../tenants.service';
import { HandlerErrorService } from 'src/common/services/handler-error.service';

@Injectable()
export class TenantConnectionService {
  private readonly logger = new Logger('TenantsConnectionsService');
  private tenantConnections: Map<string, DataSource> = new Map();

  constructor(
    @Inject(forwardRef(() => TenantsService))
    private readonly tenantsService: TenantsService,
    private readonly handlerError: HandlerErrorService,
  ) {}

  async getTenantConnection(tenantId: string): Promise<DataSource> {
    try {
      if (!this.tenantConnections.has(tenantId)) {
        const { config } =
          await this.tenantsService.getOneTenantConfigDB(tenantId);

        const dataSource = new DataSource({
          type: 'postgres',
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          database: config.database,
          entities: [__dirname + '/../../**/!(*tenant*).entity{.ts,.js}'],
          synchronize: false,
        });

        await dataSource.initialize();

        this.tenantConnections.set(tenantId, dataSource);
      }

      return this.tenantConnections.get(tenantId);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async closeTenantConnection(tenantId: string): Promise<void> {
    try {
      const connection = this.tenantConnections.get(tenantId);
      if (connection) {
        await connection.destroy();
        this.tenantConnections.delete(tenantId);
      }
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async closeAllConnections(): Promise<void> {
    try {
      for (const [tenantId] of this.tenantConnections.entries()) {
        await this.closeTenantConnection(tenantId);
      }
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }
}
