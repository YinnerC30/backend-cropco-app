import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantsService } from '../tenants.service';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { EncryptionService } from 'src/common/services/encryption.service';

@Injectable()
export class TenantConnectionService {
  private readonly logger = new Logger('TenantsConnectionsService');
  private tenantConnections: Map<string, DataSource> = new Map();

  constructor(
    @Inject(forwardRef(() => TenantsService))
    private readonly tenantsService: TenantsService,
    private readonly handlerError: HandlerErrorService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async getTenantConnection(tenantId: string): Promise<DataSource> {
    try {
      if (!this.tenantConnections.has(tenantId)) {
        const tenantDatabase =
          await this.tenantsService.getOneTenantDatabase(tenantId);

        // Extraer credenciales específicas del tenant desde la configuración
        const connectionConfig = tenantDatabase.connection_config as any;

        if (!connectionConfig || !connectionConfig.username) {
          throw new Error(`No credentials configured for tenant ${tenantId}`);
        }

        // Desencriptar la contraseña del tenant
        const decryptedPassword = await this.encryptionService.decryptPassword(
          connectionConfig.password,
        );

        const dataSource = new DataSource({
          type: 'postgres',
          host: connectionConfig.host || process.env.DB_HOST,
          port: connectionConfig.port || parseInt(process.env.DB_PORT),
          username: connectionConfig.username, // Usuario específico del tenant
          password: decryptedPassword, // Contraseña específica del tenant
          database: tenantDatabase.database_name,
          entities: [__dirname + '/../../**/!(*tenant*).entity{.ts,.js}'],
          synchronize: false,
        });

        await dataSource.initialize();

        this.tenantConnections.set(tenantId, dataSource);
      }

      return this.tenantConnections.get(tenantId);
    } catch (error) {
      console.log(error);
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
