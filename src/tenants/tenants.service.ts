import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { pathsAuthController } from 'src/auth/auth.controller';
import { ModuleActions } from 'src/auth/entities/module-actions.entity';
import { Module } from 'src/auth/entities/module.entity';
import { pathsClientsController } from 'src/clients/clients.controller';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { PathProperties } from 'src/common/interfaces/PathsController';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { pathsConsumptionController } from 'src/consumptions/consumptions.controller';
import { pathsCropsController } from 'src/crops/crops.controller';
import { pathsDashboardController } from 'src/dashboard/dashboard.controller';
import { pathsEmployeesController } from 'src/employees/employees.controller';
import { pathsHarvestsController } from 'src/harvest/harvest.controller';
import { pathsPaymentsController } from 'src/payments/payments.controller';
import { pathsSalesController } from 'src/sales/sales.controller';
import { pathsShoppingController } from 'src/shopping/shopping.controller';
import { pathsSuppliersController } from 'src/suppliers/suppliers.controller';
import { pathsSuppliesController } from 'src/supplies/supplies.controller';
import { UserActionDto } from 'src/users/dto/user-action.dto';
import { UserActions } from 'src/users/entities/user-actions.entity';
import { User } from 'src/users/entities/user.entity';
import { hashPassword } from 'src/users/helpers/encrypt-password';
import { pathsUsersController } from 'src/users/users.controller';
import { pathsWorksController } from 'src/work/work.controller';
import { DataSource, QueryRunner, Raw, Repository } from 'typeorm';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UserTenantDto } from './dto/user-tenant.dto';
import { TenantDatabase } from './entities/tenant-database.entity';
import { Tenant } from './entities/tenant.entity';
import { TenantConnectionService } from './services/tenant-connection.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger('TenantsService');
  constructor(
    @Inject(forwardRef(() => TenantConnectionService))
    private tenantConnectionService: TenantConnectionService,

    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,

    @InjectRepository(TenantDatabase)
    private tenantDatabaseRepository: Repository<TenantDatabase>,

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

  async findAll(queryParams: QueryParamsDto) {
    const { offset = 0, limit = 10, query = '' } = queryParams;
    const queryBuilder = this.tenantRepository
      .createQueryBuilder('tenants')
      .leftJoinAndSelect('tenants.databases', 'databases')
      .where('tenants.company_name ILIKE :query', { query: `%${query}%` })
      .orWhere('tenants.subdomain ILIKE :query', { query: `%${query}%` })
      .orWhere('tenants.email ILIKE :query', { query: `%${query}%` })
      .orderBy('tenants.subdomain', 'DESC')
      .skip(offset * limit)
      .take(limit);

    const [tenants, count] = await queryBuilder.getManyAndCount();

    return {
      total_row_count: count,
      current_row_count: tenants.length,
      total_page_count: Math.ceil(count / limit),
      current_page_count: offset + 1,
      records: tenants,
    };
  }

  async findOne(id: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: {
        databases: true,
      },
    });
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
      throw new ForbiddenException('The tenant is currently disabled');
    }

    return { id: tenant.id, subdomain: tenant.subdomain };
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    await this.findOne(id);
    try {
      await this.tenantRepository.update({ id }, { ...updateTenantDto });
      return await this.findOne(id);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    const tenant = await this.findOne(id);
    try {
      await this.tenantRepository.softRemove(tenant);
      await this.tenantConnectionService.closeTenantConnection(id);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async toggleStatusTenant(id: string): Promise<void> {
    const tenant = await this.findOne(id);

    await this.tenantRepository.update(tenant.id, {
      is_active: !tenant.is_active,
    });

    await this.tenantConnectionService.closeTenantConnection(id);
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
        // is_migrated: false,
      });

      await this.tenantDatabaseRepository.save(tenantDatabase);
      await this.configDataBaseTenant(tenantId);
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
        // .andWhere('tenant.is_active = true')
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

  async createModulesWithActions(queryRunner: QueryRunner): Promise<void> {
    const modulesRepository = queryRunner.manager.getRepository(Module);
    const moduleActionsRepository =
      queryRunner.manager.getRepository(ModuleActions);

    const modules = {
      auth: {
        label: 'autenticación',
        paths: pathsAuthController,
      },

      clients: {
        label: 'clientes',
        paths: pathsClientsController,
      },
      crops: {
        label: 'cultivos',
        paths: pathsCropsController,
      },
      employees: {
        label: 'empleados',
        paths: pathsEmployeesController,
      },
      harvests: {
        label: 'cosechas',
        paths: pathsHarvestsController,
      },
      payments: {
        label: 'pagos',
        paths: pathsPaymentsController,
      },
      sales: {
        label: 'ventas',
        paths: pathsSalesController,
      },
      suppliers: {
        label: 'proveedores',
        paths: pathsSuppliersController,
      },
      supplies: {
        label: 'insumos',
        paths: pathsSuppliesController,
      },
      consumptions: {
        label: 'consumos',
        paths: pathsConsumptionController,
      },
      shopping: {
        label: 'compras',
        paths: pathsShoppingController,
      },
      users: {
        label: 'usuarios',
        paths: pathsUsersController,
      },
      works: {
        label: 'trabajos',
        paths: pathsWorksController,
      },
      dashboard: {
        label: 'panel de control',
        paths: pathsDashboardController,
      },
    };

    await modulesRepository.delete({});

    for (const nameModule of Object.keys(modules)) {
      const modelEntity = modulesRepository.create({
        name: nameModule,
        label: modules[nameModule].label,
      });

      const pathList = Object.keys(modules[nameModule].paths).map((key) => {
        const element = modules[nameModule].paths[key];
        return {
          ...element,
          path: `/${nameModule}/${element.path}`,
        };
      });

      modelEntity.actions = pathList.map(
        ({ path, description, name, visibleToUser = true }: PathProperties) =>
          moduleActionsRepository.create({
            name: name,
            description: description.trim(),
            path_endpoint: path,
            is_visible: visibleToUser,
          }),
      );

      await modulesRepository.save(modelEntity);
    }
  }

  private async configDataBaseTenant(tenantId: string) {
    const tenantDatabase = await this.getOneTenantDatabase(tenantId);

    // if (tenantDatabase.is_migrated) {
    //   return {
    //     msg: 'The database has already been migrated',
    //   };
    // }

    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: tenantDatabase.database_name,
      entities: [__dirname + '/../**/!(*tenant*).entity{.ts,.js}'],
      synchronize: true,
    });

    await dataSource.initialize();

    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      await queryRunner.query(`
          create or replace function convert_to_grams(unit text, amount numeric) returns numeric
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

      await this.createModulesWithActions(queryRunner);

      await queryRunner.commitTransaction();

      // if (!tenantDatabase.is_migrated) {
      //   await this.updateStatusMigrationDB(tenantDatabase.id, true);
      // }

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

  // User Tenant DB

  async getAllUsersTenant(tenantId: string) {
    await this.findOne(tenantId);
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(tenantId);

    const userRepository = tenantConnection.getRepository(User);

    return userRepository.find();
  }

  async addUserAdminTenantDB(tenantId: string, createUserDto: UserTenantDto) {
    await this.findOne(tenantId);
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(tenantId);

    const userRepository = tenantConnection.getRepository(User);
    const userActionsRepository = tenantConnection.getRepository(UserActions);

    const [, count] = await userRepository.findAndCount({
      where: {
        roles: Raw(() => `roles @> '["admin"]'`),
      },
    });

    if (createUserDto.roles[0] === 'admin' && count >= 1) {
      throw new BadRequestException('Only one admin user is allowed');
    }

    const moduleActionsRepository =
      tenantConnection.getRepository(ModuleActions);

    const actions = (await moduleActionsRepository.find({
      select: {
        id: true,
      },
    })) as UserActionDto[];

    try {
      const user = userRepository.create({ ...createUserDto });
      user.password = await hashPassword(user.password);
      const userInDB = await userRepository.save(user);
      const actionsEntity = actions.map((act: UserActionDto) => {
        return userActionsRepository.create({
          action: act,
          user: { id: userInDB.id },
        });
      });
      userInDB.actions = actionsEntity;
      await userRepository.save(userInDB);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }
  async removeUserAdminTenantDB(tenantId: string, userId: string) {
    await this.findOne(tenantId);
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(tenantId);

    const userRepository = tenantConnection.getRepository(User);

    try {
      await userRepository.delete({ id: userId });
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }
}
