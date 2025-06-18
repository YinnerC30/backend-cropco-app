import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { DataSource, Repository } from 'typeorm';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantAdministrator } from './entities/tenant-administrator.entity';
import { TenantDatabase } from './entities/tenant-database.entity';
import { Tenant } from './entities/tenant.entity';
import { TenantConnectionService } from './services/tenant-connection.service';
import { TenantAdministradorDto } from './dto/tenant-administrator.dto';
import { hashPassword } from 'src/users/helpers/encrypt-password';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger('TenantsService');
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantDatabase)
    private tenantDatabaseRepository: Repository<TenantDatabase>,
    @InjectRepository(TenantAdministrator)
    private tenantAdministratorRepository: Repository<TenantAdministrator>,

    private dataSource: DataSource,

    private readonly handlerError: HandlerErrorService,
  ) {}

  async create(createTenantDto: CreateTenantDto) {
    // Crear el tenant
    try {
      const tenant = this.tenantRepository.create(createTenantDto);
      await this.tenantRepository.save(tenant);

      // Crear la base de datos para el tenant
      const databaseName = `cropco_tenant_${tenant.subdomain}`;
      await this.createTenantDatabase(tenant.id, databaseName);

      return tenant;
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAll() {
    const queryBuilder = this.tenantRepository.createQueryBuilder('tenants');
    const [tenants, count] = await queryBuilder.getManyAndCount();

    return {
      total_row_count: count,
      current_row_count: tenants.length,
      total_page_count: 1,
      current_page_count: 1,
      records: tenants,
    };
  }

  async findOne(id: string) {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async findOneBySubdomain(tenantSubdomain: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { subdomain: tenantSubdomain },
    });
    if (!tenant) {
      throw new NotFoundException(
        `Tenant with subdomain ${tenantSubdomain} not found`,
      );
    }

    if (!tenant.is_active) {
      throw new UnauthorizedException('The tenant is currently disabled');
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    const tenant = await this.findOne(id);
    try {
      Object.assign(tenant, updateTenantDto);
      return this.tenantRepository.save(tenant);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    const tenant = await this.findOne(id);
    try {
      return this.tenantRepository.softRemove(tenant);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  // Tenants Databases

  private async createTenantDatabase(tenantId: string, databaseName: string) {
    try {
      // Crear la base de datos
      await this.dataSource.query(`CREATE DATABASE ${databaseName}`);

      // Guardar la configuración de la base de datos
      const tenantDatabase = this.tenantDatabaseRepository.create({
        tenant: { id: tenantId },
        database_name: databaseName,
        is_migrated: false,
      });

      return await this.tenantDatabaseRepository.save(tenantDatabase);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async updateStatusMigrationDB(tenantDataBaseId: string, status: boolean) {
    try {
      await this.tenantDatabaseRepository.update(
        { id: tenantDataBaseId },
        {
          is_migrated: status,
        },
      );
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

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

      return tenantDatabase;
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async configDataBaseTenant(tenantId: string) {
    const tenantDatabase = await this.getOneTenantDatabase(tenantId);

    if (tenantDatabase.is_migrated) {
      return {
        msg: 'The database has already been migrated',
      };
    }

    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: tenantDatabase.database_name,
      entities: [__dirname + '/../**/!(*tenant*).entity{.ts,.js}'],
      synchronize: !tenantDatabase.is_migrated,
    });

    await dataSource.initialize();

    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      await queryRunner.query(`
          create function convert_to_grams(unit text, amount numeric) returns numeric
            language plpgsql
          as
          $$
          BEGIN
            CASE UPPER(unit)
              WHEN 'GRAMOS' THEN RETURN amount;  
              WHEN 'KILOGRAMOS' THEN RETURN amount * 1000;
              WHEN 'ONZAS' THEN RETURN amount * 28.3495;
              WHEN 'LIBRAS' THEN RETURN amount * 453.592;
              WHEN 'TONELADAS' THEN RETURN amount * 1000000;
              ELSE
                RAISE EXCEPTION 'Unit not valid: %', unit;
            END CASE;
          END;
          $$;
    
          alter function convert_to_grams(text, numeric) owner to "admin-cropco";
    `);

      await queryRunner.commitTransaction();

      if (!tenantDatabase.is_migrated) {
        await this.updateStatusMigrationDB(tenantDatabase.id, true);
      }

      return {
        msg: '¡Database ready to use!',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
      await dataSource.destroy();
    }
  }

  // Tenants Administrators
  async createAdmin(tenantAdministradorDto: TenantAdministradorDto) {
    // Crear el tenant
    try {
      const tenantAdmin = this.tenantAdministratorRepository.create(
        tenantAdministradorDto,
      );

      tenantAdmin.password = await hashPassword(tenantAdmin.password);

      await this.tenantAdministratorRepository.save(tenantAdmin);

      delete tenantAdmin.password;

      return tenantAdmin;
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllAdmin() {
    const queryBuilder = this.tenantAdministratorRepository.createQueryBuilder(
      'tenant_administrators',
    );
    const [tenantAdmins, count] = await queryBuilder.getManyAndCount();

    return {
      total_row_count: count,
      current_row_count: tenantAdmins.length,
      total_page_count: 1,
      current_page_count: 1,
      records: tenantAdmins,
    };
  }

  async findOneAdmin(id: string) {
    const tenantAdmin = await this.tenantAdministratorRepository.findOne({
      where: { id },
    });
    if (!tenantAdmin) {
      throw new NotFoundException(`Tenant admin with ID ${id} not found`);
    }

    return tenantAdmin;
  }

  async updateAdmin(
    id: string,
    tenantAdministradorDto: TenantAdministradorDto,
  ) {
    const tenantAdmin = await this.findOneAdmin(id);
    if (tenantAdmin.role === 'admin') {
      throw new BadRequestException('Admin cannot be updated');
    }
    try {
      Object.assign(tenantAdmin, tenantAdministradorDto);
      return this.tenantAdministratorRepository.save(tenantAdmin);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeAdmin(id: string) {
    const tenantAdmin = await this.findOneAdmin(id);
    if (tenantAdmin.role === 'admin') {
      throw new BadRequestException('Admin cannot be deleted');
    }
    try {
      return this.tenantAdministratorRepository.softRemove(tenantAdmin);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }
}
