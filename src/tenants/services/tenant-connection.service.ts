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
        const tenantDatabase =
          await this.tenantsService.getOneTenantDatabase(tenantId);

        // Extraer credenciales específicas del tenant desde la configuración
        const connectionConfig = tenantDatabase.connection_config as any;
        
        if (!connectionConfig || !connectionConfig.username) {
          throw new Error(`No credentials configured for tenant ${tenantId}`);
        }

        // Desencriptar la contraseña del tenant
        const decryptedPassword = await this.decryptTenantPassword(connectionConfig.password);

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
        console.log("🚀 ~ TenantConnectionService ~ getTenantConnection ~ dataSource:", dataSource)

        await dataSource.initialize();

        this.tenantConnections.set(tenantId, dataSource);
      }

      return this.tenantConnections.get(tenantId);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  /**
   * Desencripta la contraseña del tenant
   */
  private async decryptTenantPassword(encryptedPassword: string): Promise<string> {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const secretKey = process.env.TENANT_ENCRYPTION_KEY || 'default-key-change-this';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    
    const [ivHex, authTagHex, encrypted] = encryptedPassword.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from('additional-auth-data'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
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
