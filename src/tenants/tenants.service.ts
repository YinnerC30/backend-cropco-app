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
import { EncryptionService } from 'src/common/services/encryption.service';
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
import { BaseAdministratorService } from 'src/auth/services/base-administrator.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TenantsService extends BaseAdministratorService {
  protected readonly logger = new Logger('TenantsService');

  constructor(
    @Inject(REQUEST) request: Request,
    @Inject(forwardRef(() => TenantConnectionService))
    private tenantConnectionService: TenantConnectionService,

    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,

    @InjectRepository(TenantDatabase)
    private tenantDatabaseRepository: Repository<TenantDatabase>,

    private dataSource: DataSource,

    private readonly handlerError: HandlerErrorService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {
    super(request);
    this.setLogger(this.logger);
  }

  async create(createTenantDto: CreateTenantDto) {
    this.logWithContext(
      `Creating new tenant with subdomain: ${createTenantDto.subdomain}, company: ${createTenantDto.company_name}`,
    );

    try {
      const tenant = this.tenantRepository.create(createTenantDto);
      await this.tenantRepository.save(tenant);

      this.logWithContext(
        `Tenant created successfully with ID: ${tenant.id}, subdomain: ${tenant.subdomain}`,
      );

      return tenant;
    } catch (error) {
      this.logWithContext(
        `Failed to create tenant with subdomain: ${createTenantDto.subdomain}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAll(queryParams: QueryParamsDto) {
    this.logWithContext(
      `Finding all tenants with query: "${queryParams.query || 'no query'}", limit: ${queryParams.limit || 10}, offset: ${queryParams.offset || 0}`,
    );

    try {
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

      this.logWithContext(
        `Found ${tenants.length} tenants out of ${count} total tenants`,
      );

      return {
        total_row_count: count,
        current_row_count: tenants.length,
        total_page_count: Math.ceil(count / limit),
        current_page_count: offset + 1,
        records: tenants,
      };
    } catch (error) {
      this.logWithContext(
        `Failed to find tenants with query: "${queryParams.query || 'no query'}"`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOne(id: string) {
    this.logWithContext(`Finding tenant by ID: ${id}`);

    try {
      const tenant = await this.tenantRepository.findOne({
        where: { id },
        relations: {
          databases: true,
        },
      });

      if (!tenant) {
        this.logWithContext(`Tenant with ID: ${id} not found`, 'warn');
        throw new NotFoundException(`Tenant with ID ${id} not found`);
      }

      this.logWithContext(
        `Tenant found successfully with ID: ${id}, subdomain: ${tenant.subdomain}`,
      );

      return tenant;
    } catch (error) {
      this.logWithContext(`Failed to find tenant with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  /**
   * Find a tenant by its subdomain, using TypeORM cache for performance.
   * @param tenantSubdomain The subdomain of the tenant to find.
   * @returns An object with the tenant's id and subdomain.
   * @throws NotFoundException if the tenant does not exist.
   * @throws ForbiddenException if the tenant is not active.
   */
  async findOneBySubdomain(
    tenantSubdomain: string,
  ): Promise<{ id: string; subdomain: string }> {
    this.logWithContext(`Finding tenant by subdomain: ${tenantSubdomain}`);

    try {
      // Utiliza el cache de TypeORM para mejorar el rendimiento de esta consulta frecuente.
      const tenant = await this.tenantRepository.findOne({
        where: { subdomain: tenantSubdomain },
      });

      if (!tenant) {
        this.logWithContext(
          `Tenant with subdomain: ${tenantSubdomain} not found`,
          'warn',
        );
        throw new NotFoundException(
          `Tenant with subdomain ${tenantSubdomain} not found`,
        );
      }

      if (!tenant.is_active) {
        this.logWithContext(
          `Tenant with subdomain: ${tenantSubdomain} is disabled`,
          'warn',
        );
        throw new ForbiddenException('The tenant is currently disabled');
      }

      this.logWithContext(
        `Tenant found successfully by subdomain: ${tenantSubdomain}, ID: ${tenant.id}`,
      );

      return { id: tenant.id, subdomain: tenant.subdomain };
    } catch (error) {
      this.logWithContext(
        `Failed to find tenant by subdomain: ${tenantSubdomain}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async updateDBName(tenantId: string, newName: string) {
    this.logWithContext(
      `Updating database name for tenant ID: ${tenantId} to: ${newName}`,
    );

    try {
      const tenantDb = await this.getOneTenantDatabase(tenantId);
      const oldDatabaseName = tenantDb.database_name;
      const newDatabaseName = `cropco_tenant_${newName}`;

      // Renombrar la base de datos
      await this.dataSource.query(
        `ALTER DATABASE "${tenantDb.database_name}" RENAME TO "${newDatabaseName}"`,
      );

      // // Actualizar el nombre del rol asignado a la base de datos
      // const oldRoleName = `tenant_${tenantDb.tenant.subdomain}_user`;
      // const newRoleName = `tenant_${newName}_user`;

      // // Renombrar el rol en PostgreSQL
      // await this.dataSource.query(
      //   `ALTER ROLE "${oldRoleName}" RENAME TO "${newRoleName}"`,
      // );

      // // Asignar propiedad de la base de datos al usuario del tenant
      // await this.dataSource.query(
      //   `ALTER DATABASE "${newDatabaseName}" OWNER TO "${newRoleName}"`,
      // );

      // this.logWithContext(
      //   `Role renamed successfully from ${oldRoleName} to ${newRoleName} for tenant ID: ${tenantId}`,
      // );

      // Actualizar el nombre en la tabla tenant_databases
      await this.tenantDatabaseRepository.update(
        { id: tenantDb.id },
        {
          database_name: newDatabaseName,
          // connection_config: {
          //   ...tenantDb.connection_config,
          //   username: newRoleName,
          // },
        },
      );

      this.logWithContext(
        `Database renamed successfully from ${oldDatabaseName} to ${newDatabaseName} for tenant ID: ${tenantId}`,
      );

      return await this.getOneTenantDatabase(tenantId);
    } catch (error) {
      this.logWithContext(
        `Failed to update database name for tenant ID: ${tenantId}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async update(id: string, updateTenantDto: CreateTenantDto) {
    this.logWithContext(
      `Updating tenant with ID: ${id}, new subdomain: ${updateTenantDto.subdomain}`,
    );

    const tenant = await this.findOne(id);

    try {
      await this.tenantConnectionService.closeTenantConnection(id);
      if (updateTenantDto.subdomain !== tenant.subdomain) {
        const tenantDb = await this.updateDBName(id, updateTenantDto.subdomain);

        // Generar credenciales únicas para el tenant
        const tenantUsername = `tenant_${tenantDb.database_name.replace('cropco_tenant_', '')}_user`;
        const tenantPassword = this.encryptionService.generateSecurePassword();

        // Crear usuario específico para este tenant
        await this.dataSource.query(`SELECT create_tenant_user($1, $2)`, [
          tenantDb.database_name.replace('cropco_tenant_', ''),
          tenantPassword,
        ]);

        await this.dataSource.query(
          `GRANT ${tenantUsername} TO backend_cropco_user;`,
        );

        // Asignar propiedad de la base de datos al usuario del tenant
        await this.dataSource.query(
          `ALTER DATABASE "${tenantDb.database_name}" OWNER TO "${tenantUsername}"`,
        );

        // Asignar permisos de conexión a la base de datos
        await this.dataSource.query(
          `GRANT CONNECT ON DATABASE "${tenantDb.database_name}" TO "${tenantUsername}"`,
        );

        // Asignar todos los permisos necesarios al usuario del tenant
        await this.assignTenantUserPermissions(
          tenantDb.database_name,
          tenantUsername,
        );

        // Guardar la configuración de la base de datos con credenciales encriptadas
        await this.tenantDatabaseRepository.update(
          { id: tenantDb.id },
          {
            connection_config: {
              username: tenantUsername,
              // Encriptar la contraseña antes de guardarla
              password: this.encryptionService.encryptPassword(tenantPassword),
              host: this.configService.get<string>('DB_HOST'),
              port: this.configService.get<number>('DB_PORT'),
            },
          },
        );
      }
      await this.tenantRepository.update({ id }, { ...updateTenantDto });

      this.logWithContext(`Tenant updated successfully with ID: ${id}`);

      return await this.findOne(id);
    } catch (error) {
      this.logWithContext(`Failed to update tenant with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    this.logWithContext(`Removing tenant with ID: ${id}`);

    const tenant = await this.findOne(id);

    try {
      await this.tenantRepository.softRemove(tenant);
      await this.tenantConnectionService.closeTenantConnection(id);

      this.logWithContext(
        `Tenant removed successfully with ID: ${id}, subdomain: ${tenant.subdomain}`,
      );
    } catch (error) {
      this.logWithContext(`Failed to remove tenant with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async toggleStatusTenant(id: string): Promise<void> {
    this.logWithContext(`Toggling status for tenant ID: ${id}`);

    try {
      const tenant = await this.findOne(id);

      await this.tenantRepository.update(tenant.id, {
        is_active: !tenant.is_active,
      });

      await this.tenantConnectionService.closeTenantConnection(id);

      this.logWithContext(
        `Status toggled successfully for tenant ID: ${id}, new status: ${!tenant.is_active ? 'active' : 'inactive'}`,
      );
    } catch (error) {
      this.logWithContext(
        `Failed to toggle status for tenant ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  // Tenants Databases

  async createTenantDatabase(tenantId: string) {
    // Crear la base de datos para el tenant

    const tenant = await this.findOne(tenantId);

    const databaseName = `cropco_tenant_${tenant.subdomain}`;

    this.logWithContext(
      `Creating tenant database: ${databaseName} for tenant ID: ${tenantId}`,
    );

    try {
      // Generar credenciales únicas para el tenant
      const tenantUsername = `tenant_${databaseName.replace('cropco_tenant_', '')}_user`;
      const tenantPassword = this.encryptionService.generateSecurePassword();

      this.logWithContext(
        `Database ${databaseName} created successfully for tenant ID: ${tenantId}`,
      );

      // Crear usuario específico para este tenant
      await this.dataSource.query(`SELECT create_tenant_user($1, $2)`, [
        databaseName.replace('cropco_tenant_', ''),
        tenantPassword,
      ]);

      await this.dataSource.query(
        `GRANT ${tenantUsername} TO backend_cropco_user;`,
      );

      // Crear la base de datos
      await this.dataSource.query(
        `CREATE DATABASE ${databaseName} OWNER = ${tenantUsername}`,
      );

      // Asignar permisos de conexión a la base de datos
      await this.dataSource.query(
        `GRANT CONNECT ON DATABASE "${databaseName}" TO "${tenantUsername}"`,
      );

      // Asignar todos los permisos necesarios al usuario del tenant
      await this.assignTenantUserPermissions(databaseName, tenantUsername);

      // Guardar la configuración de la base de datos con credenciales encriptadas
      const tenantDatabase = this.tenantDatabaseRepository.create({
        tenant: { id: tenantId },
        database_name: databaseName,
        connection_config: {
          username: tenantUsername,
          // Encriptar la contraseña antes de guardarla
          password: this.encryptionService.encryptPassword(tenantPassword),
          host: this.configService.get<string>('DB_HOST'),
          port: this.configService.get<number>('DB_PORT'),
        },
      });

      await this.tenantDatabaseRepository.save(tenantDatabase);

      await this.tenantRepository.update(
        { id: tenantId },
        { is_created_db: true },
      );

      this.logWithContext(
        `Tenant database configuration saved for tenant ID: ${tenantId}`,
      );
    } catch (error) {
      this.logWithContext(
        `Failed to create tenant database for tenant ID: ${tenantId}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async getOneTenantDatabase(tenantId: string) {
    this.logWithContext(
      `Getting database configuration for tenant ID: ${tenantId}`,
    );

    try {
      const tenantDatabase = await this.tenantDatabaseRepository
        .createQueryBuilder('tenant_databases')
        .leftJoinAndSelect('tenant_databases.tenant', 'tenant')
        .where('tenant.id = :tenantId', { tenantId })
        .getOne();

      if (!tenantDatabase) {
        this.logWithContext(
          `Database configuration not found for tenant ID: ${tenantId}`,
          'warn',
        );
        throw new NotFoundException(
          `Database for tenant ${tenantId} not found`,
        );
      }

      if (tenantDatabase.tenant.is_active === false) {
        this.logWithContext(
          `Database access denied for disabled tenant ID: ${tenantId}`,
          'warn',
        );
        throw new ForbiddenException(
          `Database for tenant ${tenantId} is disabled`,
        );
      }

      this.logWithContext(
        `Database configuration retrieved successfully for tenant ID: ${tenantId}`,
      );

      return tenantDatabase;
    } catch (error) {
      this.logWithContext(
        `Failed to get database configuration for tenant ID: ${tenantId}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async createModulesWithActions(queryRunner: QueryRunner): Promise<void> {
    this.logWithContext('Creating modules with actions for tenant database');

    try {
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

      this.logWithContext('Deleting existing modules before creating new ones');
      await modulesRepository.delete({});

      for (const nameModule of Object.keys(modules)) {
        this.logWithContext(
          `Creating module: ${nameModule} (${modules[nameModule].label})`,
        );

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
        this.logWithContext(
          `Module ${nameModule} created successfully with ${modelEntity.actions.length} actions`,
        );
      }

      this.logWithContext(
        `Modules creation completed successfully. Total modules created: ${Object.keys(modules).length}`,
      );
    } catch (error) {
      this.logWithContext('Failed to create modules with actions', 'error');
      throw error; // Re-throw para que sea manejado por el método padre
    }
  }

  async configDataBaseTenant(tenantId: string) {
    const tenantDB = await this.getOneTenantDatabase(tenantId);
    if (tenantDB.is_migrated) {
      return {
        msg: 'Tenant DB is ready to use',
      };
    }
    const tenantUsername = tenantDB.connection_config.username;
    const tenantPassword = this.encryptionService.decryptPassword(
      tenantDB.connection_config.password,
    );
    this.logWithContext(
      `Configuring database for tenant ID: ${tenantId} with user: ${tenantUsername}`,
    );

    try {
      // Usar las credenciales específicas del tenant para configurar la base de datos
      const dataSource = new DataSource({
        type: 'postgres',
        host: this.configService.get<string>('DB_HOST'),
        port: this.configService.get<number>('DB_PORT'),
        username: tenantUsername, // Usuario específico del tenant
        password: tenantPassword, // Contraseña específica del tenant
        database: tenantDB.database_name,
        // entities: [__dirname + '/../**/!(*tenant*).entity{.ts,.js}'],
        entities: [
          __dirname + '/../**/!(*tenant*|*administrator*).entity{.ts,.js}',
        ],
        // entities: [
        //   __dirname + '/../**/!(*tenant|administrator).entity{.ts,.js}',
        // ],
        synchronize: true,
      });

      this.logWithContext(
        `Initializing database connection for tenant ID: ${tenantId} with tenant user`,
      );
      await dataSource.initialize();

      const queryRunner = dataSource.createQueryRunner();

      try {
        await queryRunner.connect();
        await queryRunner.startTransaction();

        this.logWithContext(
          `Creating database functions for tenant ID: ${tenantId}`,
        );
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
    
          -- Asignar la función al usuario del tenant en lugar de admin-cropco
          alter function convert_to_grams(text, numeric) owner to "${tenantUsername}";
        `);

        await this.createModulesWithActions(queryRunner);

        await queryRunner.commitTransaction();

        await this.tenantDatabaseRepository.update(
          { tenant: { id: tenantId } },
          { is_migrated: true },
        );

        this.logWithContext(
          `Database configuration completed successfully for tenant ID: ${tenantId}`,
        );

        return {
          msg: '¡Database ready to use!',
        };
      } catch (error) {
        this.logWithContext(
          `Rolling back database configuration for tenant ID: ${tenantId}`,
          'error',
        );
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
        await dataSource.destroy();
      }
    } catch (error) {
      this.logWithContext(
        `Failed to configure database for tenant ID: ${tenantId}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  /**
   * Asigna todos los permisos necesarios a un usuario de tenant en su base de datos
   */
  private async assignTenantUserPermissions(
    databaseName: string,
    tenantUsername: string,
  ): Promise<void> {
    this.logWithContext(
      `Assigning permissions to user ${tenantUsername} for database ${databaseName}`,
    );

    // Crear una conexión específica a la base de datos del tenant para asignar permisos
    const tenantDataSource = new DataSource({
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      username: this.configService.get<string>('DB_USERNAME'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: databaseName,
    });

    await tenantDataSource.initialize();

    try {
      // Asignar permisos dentro de la base de datos del tenant
      await tenantDataSource.query(
        `GRANT USAGE ON SCHEMA public TO "${tenantUsername}"`,
      );

      // Permisos para consultas (SELECT)
      await tenantDataSource.query(
        `GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${tenantUsername}"`,
      );

      // Permisos para actualizaciones (INSERT, UPDATE, DELETE)
      await tenantDataSource.query(
        `GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${tenantUsername}"`,
      );

      // Permisos para uso de funciones
      await tenantDataSource.query(
        `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "${tenantUsername}"`,
      );

      // Configurar permisos para tablas futuras
      await tenantDataSource.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${tenantUsername}"`,
      );

      // Configurar permisos para funciones futuras
      await tenantDataSource.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO "${tenantUsername}"`,
      );

      // Asignar permisos para secuencias (necesario para INSERT con auto-increment)
      await tenantDataSource.query(
        `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${tenantUsername}"`,
      );

      // Configurar permisos para secuencias futuras
      await tenantDataSource.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "${tenantUsername}"`,
      );

      this.logWithContext(
        `Permissions assigned successfully to user ${tenantUsername} for database ${databaseName}`,
      );
    } finally {
      await tenantDataSource.destroy();
    }
  }

  // User Tenant DB

  async getAllUsersTenant(tenantId: string) {
    this.logWithContext(`Getting all users for tenant ID: ${tenantId}`);

    try {
      await this.findOne(tenantId);
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(tenantId);

      const userRepository = tenantConnection.getRepository(User);
      const users = await userRepository.find();

      this.logWithContext(
        `Found ${users.length} users for tenant ID: ${tenantId}`,
      );

      return users;
    } catch (error) {
      this.logWithContext(
        `Failed to get users for tenant ID: ${tenantId}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async addUserAdminTenantDB(tenantId: string, createUserDto: UserTenantDto) {
    this.logWithContext(
      `Adding admin user to tenant ID: ${tenantId}, email: ${createUserDto.email}`,
    );

    try {
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
        this.logWithContext(
          `Admin user creation blocked for tenant ID: ${tenantId} - only one admin allowed`,
          'warn',
        );
        throw new BadRequestException('Only one admin user is allowed');
      }

      const moduleActionsRepository =
        tenantConnection.getRepository(ModuleActions);

      const actions = (await moduleActionsRepository.find({
        select: {
          id: true,
        },
      })) as UserActionDto[];

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

      this.logWithContext(
        `Admin user created successfully for tenant ID: ${tenantId}, user ID: ${userInDB.id}, total actions: ${actions.length}`,
      );
    } catch (error) {
      this.logWithContext(
        `Failed to add admin user to tenant ID: ${tenantId}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeUserAdminTenantDB(tenantId: string, userId: string) {
    this.logWithContext(
      `Removing admin user ID: ${userId} from tenant ID: ${tenantId}`,
    );

    try {
      await this.findOne(tenantId);
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(tenantId);

      const userRepository = tenantConnection.getRepository(User);
      await userRepository.delete({ id: userId });

      this.logWithContext(
        `Admin user removed successfully from tenant ID: ${tenantId}, user ID: ${userId}`,
      );
    } catch (error) {
      this.logWithContext(
        `Failed to remove admin user from tenant ID: ${tenantId}, user ID: ${userId}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }
}
