import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { pathsClientsController } from 'src/clients/clients.controller';
import { PathProperties } from 'src/common/interfaces/PathsController';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { BaseTenantService } from 'src/common/services/base-tenant.service';
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
import { UserDto } from 'src/users/dto/user.dto';
import { UserActions } from 'src/users/entities/user-actions.entity';
import { User } from 'src/users/entities/user.entity';
import { RoleUser } from 'src/users/types/role-user.type';
import { pathsUsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';
import { pathsWorksController } from 'src/work/work.controller';
import { Repository } from 'typeorm';
import { pathsAuthController } from './auth.controller';
import { LoginUserDto } from './dto/login-user.dto';
import { ModuleActions } from './entities/module-actions.entity';
import { Module } from './entities/module.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService extends BaseTenantService {
  protected readonly logger = new Logger('AuthService');
  private usersRepository: Repository<User>;
  private userActionsRepository: Repository<UserActions>;
  private modulesRepository: Repository<Module>;
  private moduleActionsRepository: Repository<ModuleActions>;

  constructor(
    @Inject(REQUEST) request: Request,
    @InjectRepository(User) defaultUsersRepo: Repository<User>,
    @InjectRepository(UserActions) defaultActionsRepo: Repository<UserActions>,
    @InjectRepository(Module) defaultModulesRepo: Repository<Module>,
    @InjectRepository(ModuleActions)
    defaultModuleActionsRepo: Repository<ModuleActions>,
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
    private readonly handlerError: HandlerErrorService,
  ) {
    super(request);

    // Configurar el logger de BaseTenantService para usar el logger de AuthService
    this.setLogger(this.logger);

    this.usersRepository = this.tenantConnection
      ? this.getTenantRepository(User)
      : defaultUsersRepo;

    this.userActionsRepository = this.tenantConnection
      ? this.getTenantRepository(UserActions)
      : defaultActionsRepo;

    this.modulesRepository = this.tenantConnection
      ? this.getTenantRepository(Module)
      : defaultModulesRepo;

    this.moduleActionsRepository = this.tenantConnection
      ? this.getTenantRepository(ModuleActions)
      : defaultModuleActionsRepo;
  }

  async login(
    loginUserDto: LoginUserDto,
  ): Promise<Partial<User> & { modules: Module[] } & { token: string }> {
    this.logWithContext(`Attempting login for email: ${loginUserDto.email}`);

    try {
      const { password, email } = loginUserDto;
      const user = await this.usersRepository.findOne({
        where: { email },
        select: {
          email: true,
          password: true,
          id: true,
          first_name: true,
          last_name: true,
          is_active: true,
        },
      });

      if (!user) {
        this.logWithContext(
          `Login failed - user not found for email: ${email}`,
          'warn',
        );
        throw new UnauthorizedException('Credentials are not valid (email)');
      }

      if (!user.is_active) {
        this.logWithContext(
          `Login failed - user ${user.first_name} is inactive`,
          'warn',
        );
        throw new UnauthorizedException(
          `User ${user.first_name} is inactive, talk with administrator`,
        );
      }

      if (!bcrypt.compareSync(password, user.password)) {
        this.logWithContext(
          `Login failed - invalid password for email: ${email}`,
          'warn',
        );
        throw new UnauthorizedException('Credentials are not valid (password)');
      }

      const userPermits = await this.modulesRepository.find({
        select: {
          name: true,
          label: true,
          actions: {
            id: true,
            description: true,
            path_endpoint: true,
            name: true,
          },
        },
        relations: {
          actions: true,
        },
        where: {
          actions: {
            users_actions: {
              user: {
                id: user.id,
              },
            },
          },
        },
      });

      if (userPermits.length === 0) {
        this.logWithContext(
          `Login failed - user ${user.first_name} has no permissions`,
          'warn',
        );
        throw new ForbiddenException(
          `The user does not have enough permissions to access`,
        );
      }

      this.logWithContext(
        `Login successful for user: ${user.first_name} ${user.last_name} (${email}), modules count: ${userPermits.length}`,
      );

      delete user.password;
      return {
        ...user,
        modules: userPermits,
        token: this.generateJwtToken({ id: user.id }),
      };
    } catch (error) {
      this.logWithContext(
        `Login failed for email: ${loginUserDto.email}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  generateJwtToken(payload: JwtPayload): string {
    this.logWithContext(`Generating JWT token for user ID: ${payload.id}`);

    try {
      const token = this.jwtService.sign(payload, { expiresIn: '6h' });
      this.logWithContext(
        `JWT token generated successfully for user ID: ${payload.id}`,
      );
      return token;
    } catch (error) {
      this.logWithContext(
        `Failed to generate JWT token for user ID: ${payload.id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async renewToken(token: string): Promise<{ token: string }> {
    this.logWithContext('Attempting to renew JWT token');

    try {
      const { id } = this.jwtService.verify(token);
      this.logWithContext(`Renewing token for user ID: ${id}`);
      const newToken = this.generateJwtToken({ id });
      this.logWithContext(`Token renewed successfully for user ID: ${id}`);
      return {
        token: newToken,
      };
    } catch (error) {
      this.logWithContext('Failed to renew JWT token', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async checkAuthStatus(
    token: string,
  ): Promise<{ message: string; statusCode: number }> {
    this.logWithContext('Checking authentication status');

    try {
      this.jwtService.verify(token);
      this.logWithContext('Token validation successful');
      return {
        message: 'Token valid',
        statusCode: 200,
      };
    } catch (error: any) {
      this.logWithContext('Token validation failed', 'warn');
      this.handlerError.handle(error, this.logger);
    }
  }

  async createModulesWithActions(): Promise<void> {
    this.logWithContext('Starting creation of modules with actions');

    try {
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
      await this.modulesRepository.delete({});

      for (const nameModule of Object.keys(modules)) {
        this.logWithContext(
          `Creating module: ${nameModule} (${modules[nameModule].label})`,
        );

        const modelEntity = this.modulesRepository.create({
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
            this.moduleActionsRepository.create({
              name: name,
              description: description.trim(),
              path_endpoint: path,
              is_visible: visibleToUser,
            }),
        );

        await this.modulesRepository.save(modelEntity);
        this.logWithContext(
          `Module ${nameModule} created successfully with ${modelEntity.actions.length} actions`,
        );
      }

      this.logWithContext(
        `Modules creation completed successfully. Total modules created: ${Object.keys(modules).length}`,
      );
    } catch (error) {
      this.logWithContext('Failed to create modules with actions', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllModules(): Promise<Module[]> {
    this.logWithContext('Finding all modules with visible actions');

    try {
      const modules = await this.modulesRepository.find({
        where: { actions: { is_visible: true } },
        relations: { actions: true },
      });

      this.logWithContext(
        `Found ${modules.length} modules with visible actions`,
      );
      return modules;
    } catch (error) {
      this.logWithContext('Failed to find all modules', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async convertToAdmin(
    id: string,
  ): Promise<Partial<User> & { modules: Module[] }> {
    this.logWithContext(`Converting user to admin with ID: ${id}`);

    try {
      const { modules, ...user } = await this.userService.findOne(id);

      const actions = (await this.moduleActionsRepository.find({
        select: {
          id: true,
        },
      })) as UserActionDto[];

      this.logWithContext(
        `Converting user ${user.first_name} ${user.last_name} to admin with ${actions.length} actions`,
      );

      const updatedUser = await this.userService.update(id, {
        ...user,
        actions,
      } as UserDto);

      this.logWithContext(
        `User with ID: ${id} successfully converted to admin`,
      );
      return updatedUser;
    } catch (error) {
      this.logWithContext(
        `Failed to convert user with ID: ${id} to admin`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async givePermissionsToModule(
    id: string,
    nameModule: string,
  ): Promise<Partial<User> & { modules: Module[] }> {
    this.logWithContext(
      `Giving permissions to module ${nameModule} for user ID: ${id}`,
    );

    try {
      const { modules, ...user } = await this.userService.findOne(id);

      const module = await this.modulesRepository.findOne({
        relations: {
          actions: true,
        },
        where: {
          name: nameModule,
        },
      });

      if (!module) {
        this.logWithContext(`Module ${nameModule} not found`, 'warn');
        throw new BadRequestException(`Module ${nameModule} not found`);
      }

      const { actions } = module;

      this.logWithContext(
        `Giving ${actions.length} permissions from module ${nameModule} to user ${user.first_name} ${user.last_name}`,
      );

      const updatedUser = await this.userService.update(id, {
        ...user,
        actions: actions.flatMap((action) => ({ id: action.id })),
      } as UserDto);

      this.logWithContext(
        `Permissions successfully granted to user ID: ${id} for module: ${nameModule}`,
      );
      return updatedUser;
    } catch (error) {
      this.logWithContext(
        `Failed to give permissions to module ${nameModule} for user ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async removePermissionsToModule(
    id: string,
    nameModule: string,
  ): Promise<void> {
    this.logWithContext(
      `Removing permissions from module ${nameModule} for user ID: ${id}`,
    );

    try {
      const user = await this.userService.findOne(id);

      const actions = (await this.moduleActionsRepository.find({
        select: {
          id: true,
        },
        where: {
          name: nameModule,
        },
      })) as UserActionDto[];

      if (actions.length === 0) {
        this.logWithContext(
          `No actions found for module ${nameModule}`,
          'warn',
        );
        return;
      }

      this.logWithContext(
        `Removing ${actions.length} permissions from module ${nameModule} for user ${user.first_name} ${user.last_name}`,
      );

      await Promise.all([
        ...actions.map(async (action) => {
          await this.userActionsRepository.delete({ user: { id }, action });
        }),
      ]);

      this.logWithContext(
        `Permissions successfully removed from user ID: ${id} for module: ${nameModule}`,
      );
    } catch (error) {
      this.logWithContext(
        `Failed to remove permissions from module ${nameModule} for user ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async addPermission(userId: string, actionName: string) {
    this.logWithContext(
      `Adding permission ${actionName} to user ID: ${userId}`,
    );

    try {
      const user = await this.userService.findOne(userId);
      const action = await this.moduleActionsRepository.findOne({
        where: { name: actionName },
      });

      if (!action) {
        this.logWithContext(`Action ${actionName} not found`, 'warn');
        throw new BadRequestException('Action not found');
      }

      const userHasAction = user.actions.some(
        (userAction) => userAction.id === action.id,
      );

      if (userHasAction) {
        this.logWithContext(
          `User ${user.first_name} ${user.last_name} already has permission ${actionName}`,
          'warn',
        );
        return 'Ya tiene la acción';
      }

      const userAction = this.userActionsRepository.create({ user, action });
      await this.userActionsRepository.save(userAction);

      this.logWithContext(
        `Permission ${actionName} successfully added to user ${user.first_name} ${user.last_name}`,
      );
      return 'Toco crear la acción';
    } catch (error) {
      this.logWithContext(
        `Failed to add permission ${actionName} to user ID: ${userId}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async removePermission(userId: string, actionName: string) {
    this.logWithContext(
      `Removing permission ${actionName} from user ID: ${userId}`,
    );

    try {
      const user = await this.userService.findOne(userId);
      const action = await this.moduleActionsRepository.findOne({
        where: { name: actionName },
      });

      if (!action) {
        this.logWithContext(`Action ${actionName} not found`, 'warn');
        throw new BadRequestException('Action not found');
      }

      const userAction = await this.userActionsRepository.findOne({
        where: { action: { id: action.id }, user: { id: user.id } },
      });

      if (!userAction) {
        this.logWithContext(
          `User ${user.first_name} ${user.last_name} doesn't have permission ${actionName}`,
          'warn',
        );
        return 'No fue necesario eliminar la acción';
      }

      const result = await this.userActionsRepository.delete({
        id: userAction.id,
      });

      this.logWithContext(
        `Permission ${actionName} successfully removed from user ${user.first_name} ${user.last_name}`,
      );
      return result;
    } catch (error) {
      this.logWithContext(
        `Failed to remove permission ${actionName} from user ID: ${userId}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async convertToAdminUserSeed(): Promise<
    Partial<User> & { modules: Module[] }
  > {
    this.logWithContext('Creating admin user seed');

    try {
      const data = {
        first_name: 'demo name',
        last_name: 'demo lastName',
        email: 'demouser@example.com',
        password: '123456',
        cell_phone_number: '3001234567',
        is_active: true,
        actions: [],
        roles: ['admin'] as RoleUser[],
      };

      this.logWithContext(`Creating admin seed user with email: ${data.email}`);
      const user = await this.userService.create(data);

      const actions = (await this.moduleActionsRepository.find({
        select: {
          id: true,
        },
      })) as UserActionDto[];

      this.logWithContext(
        `Assigning ${actions.length} actions to admin seed user`,
      );

      const updatedUser = await this.userService.update(
        user.id,
        { ...user, actions },
        true,
      );

      this.logWithContext(
        `Admin seed user created successfully with ID: ${user.id}`,
      );
      return updatedUser;
    } catch (error) {
      this.logWithContext('Failed to create admin user seed', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async createUserToTests(): Promise<User> {
    this.logWithContext('Creating test user');

    try {
      const differentiator = Math.floor(Math.random() * 1000);
      const data = {
        first_name: `user test ${differentiator}`,
        last_name: '',
        email: `usertest${differentiator}@example.com`,
        password: '123456',
        cell_phone_number: '3001234567',
        is_active: true,
        actions: [],
      };

      this.logWithContext(`Creating test user with email: ${data.email}`);
      const user = await this.userService.create(data);

      this.logWithContext(
        `Test user created successfully with ID: ${user.id}, email: ${data.email}`,
      );
      return user;
    } catch (error) {
      this.logWithContext('Failed to create test user', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async deleteUserToTests(id: string): Promise<void> {
    this.logWithContext(`Deleting test user with ID: ${id}`);

    try {
      await this.userService.remove(id);
      this.logWithContext(`Test user with ID: ${id} deleted successfully`);
    } catch (error) {
      this.logWithContext(`Failed to delete test user with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }
}
