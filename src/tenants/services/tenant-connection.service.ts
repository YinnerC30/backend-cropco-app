import { ForbiddenException, Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EncryptionService } from 'src/common/services/encryption.service';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { DataSource, Repository } from 'typeorm';
import { TenantDatabase } from '../entities/tenant-database.entity';

@Injectable({ scope: Scope.DEFAULT })
export class TenantConnectionService {
  private readonly logger = new Logger('TenantsConnectionsService');
  private tenantConnections: Map<string, DataSource> = new Map();

  constructor(
    @InjectRepository(TenantDatabase)
    private tenantDatabaseRepository: Repository<TenantDatabase>,
    private readonly handlerError: HandlerErrorService,
    private readonly encryptionService: EncryptionService,
  ) { }

  async getOneTenantDatabase(tenantId: string) {
    try {
      const tenantDatabase = await this.tenantDatabaseRepository
        .createQueryBuilder('tenant_databases')
        .leftJoinAndSelect('tenant_databases.tenant', 'tenant')
        .where('tenant.id = :tenantId', { tenantId })
        .getOne();

      if (!tenantDatabase) {
        throw new NotFoundException(
          `Database for tenant ${tenantId} not found`,
        );
      }

      if (tenantDatabase.tenant.is_active === false) {
        throw new ForbiddenException(
          `Database for tenant ${tenantId} is disabled`,
        );
      }

      return tenantDatabase;
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async getTenantConnection(tenantId: string): Promise<DataSource> {
    try {
      if (!this.tenantConnections.has(tenantId)) {
        const tenantDatabase =
          await this.getOneTenantDatabase(tenantId);

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
          host: connectionConfig.host,
          port: connectionConfig.port,
          username: connectionConfig.username, // Usuario específico del tenant
          password: decryptedPassword, // Contraseña específica del tenant
          database: tenantDatabase.database_name,
          entities: [
            __dirname + '/../../**/!(*tenant*|*administrator*).entity{.ts,.js}',
          ],
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
        this.logger.log(`Connection closed for tenant ${tenantId}`);
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
