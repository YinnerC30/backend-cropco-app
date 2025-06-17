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

@Injectable()
export class TenantsService {
  private readonly logger = new Logger('TenantsService');
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantDatabase)
    private tenantDatabaseRepository: Repository<TenantDatabase>,
    @InjectRepository(TenantAdministrator)
    private dataSource: DataSource,
    private tenantConnectionService: TenantConnectionService,
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
    return this.tenantRepository.find();
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

  private async createTenantDatabase(tenantId: string, databaseName: string) {
    try {
      // Crear la base de datos
      await this.dataSource.query(`CREATE DATABASE ${databaseName}`);

      // Guardar la configuración de la base de datos
      const tenantDatabase = this.tenantDatabaseRepository.create({
        tenant: { id: tenantId },
        database_name: databaseName,
        connection_config: {
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
        },
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

  async getOneTenantConfigDB(tenantId: string) {
    try {
      const tenantDatabase = await this.tenantDatabaseRepository
        .createQueryBuilder('tenant_databases')
        .leftJoinAndSelect('tenant_databases.tenant', 'tenant')
        .where('tenant.id = :tenantId', { tenantId })
        .getOne();

      if (!tenantDatabase) {
        throw new Error(`Database for tenant ${tenantId} not found`);
      }

      return {
        config: {
          type: 'postgres',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: tenantDatabase.database_name,
          entities: [__dirname + '/../**/!(*tenant*).entity{.ts,.js}'],
          synchronize: true,
        },
        is_migrated: tenantDatabase.is_migrated,
        id_database: tenantDatabase.id,
      };
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async configDataBaseTenant(tenantId: string) {
    const { config, is_migrated, id_database } =
      await this.getOneTenantConfigDB(tenantId);

    if (is_migrated) {
      return {
        msg: 'The database has already been migrated',
      };
    }

    const dataSource = new DataSource({
      type: 'postgres',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      entities: [__dirname + '/../**/!(*tenant*).entity{.ts,.js}'],
      synchronize: !is_migrated,
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

      if (!is_migrated) {
        await this.updateStatusMigrationDB(id_database, true);
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

  // async addUserToTenant(tenantId: string, userId: string, role: string) {
  //   const tenantUser = this.tenantUserRepository.create({
  //     // tenant: { id: tenantId },
  //     // userId,
  //     // role,
  //   });

  //   return this.tenantUserRepository.save(tenantUser);
  // }

  // async getTenantUsers(tenantId: string) {
  //   return this.tenantUserRepository.find({
  //     where: { tenantId, is_active: true },
  //   });
  // }
}
