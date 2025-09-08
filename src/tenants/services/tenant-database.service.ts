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

@Injectable({ scope: Scope.DEFAULT })
export class TenantsDatabaseService {
  protected readonly logger = new Logger('TenantsDatabaseService');

  constructor(
    @InjectRepository(TenantDatabase)
    private tenantDatabaseRepository: Repository<TenantDatabase>,
    private readonly handlerError: HandlerErrorService,
  ) {}

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
}
