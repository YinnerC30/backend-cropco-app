import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { Repository } from 'typeorm';
import { TenantDatabase } from '../entities/tenant-database.entity';
import { UpdateTenantDatabaseDto } from '../dto/update-tenant-database.dto';
import { EncryptionService } from '@/common/services/encryption.service';
import { TenantConnectionService } from './tenant-connection.service';

@Injectable({ scope: Scope.DEFAULT })
export class TenantsDatabaseService {
  protected readonly logger = new Logger('TenantsDatabaseService');

  constructor(
    @InjectRepository(TenantDatabase)
    private tenantDatabaseRepository: Repository<TenantDatabase>,
    private readonly handlerError: HandlerErrorService,
    private readonly encryptionService: EncryptionService,
    private tenantConnectionService: TenantConnectionService,
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

  async updateTenantDatabase(tenantId: string, dto: UpdateTenantDatabaseDto) {
    this.logger.log(`Actualizando base de datos para tenant ID: ${tenantId}`);
    const tenantDatabase: any = await this.getOneTenantDatabase(tenantId);

    try {
      await this.tenantDatabaseRepository.update(
        { id: tenantDatabase.id },
        {
          database_name: dto.database_name,
          connection_config: {
            username: dto.username,
            password: this.encryptionService.encryptPassword(dto.password),
            host: dto.host,
            port: dto.port,
          },
        },
      );
      await this.tenantConnectionService.closeTenantConnection(tenantId);

      this.logger.log(
        `Base de datos actualizada exitosamente para tenant ID: ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al actualizar base de datos para tenant ID: ${tenantId}, ${error.message}`,
      );
      this.handlerError.handle(error, this.logger);
    }
  }
}
