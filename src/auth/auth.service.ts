import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { pathsClientsController } from 'src/clients/clients.controller';
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
import { User } from 'src/users/entities/user.entity';
import { pathsUsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';
import { pathsWorksController } from 'src/work/work.controller';
import { Repository } from 'typeorm';
import { pathsAuthController } from './auth.controller';
import { LoginUserDto } from './dto/login-user.dto';
import { ModuleActions } from './entities/module-actions.entity';
import { Module } from './entities/module.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserActions } from 'src/users/entities/user-actions.entity';
import { UserDto } from 'src/users/dto/user.dto';
import { HandlerErrorService } from 'src/common/services/handler-error.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserActions)
    private readonly userActionsRepository: Repository<UserActions>,
    @InjectRepository(Module)
    private readonly modulesRepository: Repository<Module>,
    @InjectRepository(ModuleActions)
    private readonly moduleActionsRepository: Repository<ModuleActions>,
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
    private readonly handlerError: HandlerErrorService,
  ) {}

  async login(
    loginUserDto: LoginUserDto,
  ): Promise<Partial<User> & { modules: Module[] } & { token: string }> {
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

    if (!user)
      throw new UnauthorizedException('Credentials are not valid (email)');

    if (!user.is_active) {
      throw new UnauthorizedException(
        `User ${user.first_name} is inactive, talk with administrator`,
      );
    }

    if (!bcrypt.compareSync(password, user.password))
      throw new UnauthorizedException('Credentials are not valid (password)');

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
      throw new ForbiddenException(
        `The user does not have enough permissions to access`,
      );
    }

    delete user.password;
    return {
      ...user,
      modules: userPermits,
      token: this.generateJwtToken({ id: user.id }),
    };
  }

  generateJwtToken(payload: JwtPayload): string {
    const token = this.jwtService.sign(payload);
    return token;
  }

  async renewToken(token: string): Promise<{ token: string }> {
    const { id } = this.jwtService.verify(token);
    const newToken = this.generateJwtToken({ id });
    return {
      token: newToken,
    };
  }

  async checkAuthStatus(
    token: string,
  ): Promise<{ message: string; statusCode: number }> {
    try {
      this.jwtService.verify(token);
      return {
        message: 'Token valid',
        statusCode: 200,
      };
    } catch (error: any) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired'); // Lanzar la excepción
      } else {
        throw new UnauthorizedException('Invalid token'); // Manejar otros tipos de errores
      }
    }
  }

  async createModulesWithActions(): Promise<void> {
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

    await this.modulesRepository.delete({});

    for (const nameModule of Object.keys(modules)) {
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

      modelEntity.actions = pathList.map(({ path, description, name }: any) =>
        this.moduleActionsRepository.create({
          name: name,
          description: description.trim(),
          path_endpoint: path,
        }),
      );

      await this.modulesRepository.save(modelEntity);
    }
  }

  async findAllModules(): Promise<Module[]> {
    return await this.modulesRepository.find({ relations: { actions: true } });
  }

  async convertToAdmin(
    id: string,
  ): Promise<Partial<User> & { modules: Module[] }> {
    const { modules, ...user } = await this.userService.findOne(id);

    const actions = (await this.moduleActionsRepository.find({
      select: {
        id: true,
      },
    })) as UserActionDto[];

    return await this.userService.update(id, { ...user, actions } as UserDto);
  }

  async givePermissionsToModule(
    id: string,
    nameModule: string,
  ): Promise<Partial<User> & { modules: Module[] }> {
    const { modules, ...user } = await this.userService.findOne(id);

    const { actions } = await this.modulesRepository.findOne({
      relations: {
        actions: true,
      },
      where: {
        name: nameModule,
      },
    });

    return await this.userService.update(id, {
      ...user,
      actions: actions.flatMap((action) => ({ id: action.id })),
    } as UserDto);
  }

  async removePermissionsToModule(
    id: string,
    nameModule: string,
  ): Promise<void> {
    await this.userService.findOne(id);

    const actions = (await this.moduleActionsRepository.find({
      select: {
        id: true,
      },
      where: {
        name: nameModule,
      },
    })) as UserActionDto[];

    await Promise.all([
      ...actions.map(async (action) => {
        await this.userActionsRepository.delete({ user: { id }, action });
      }),
    ]);
  }

  async addPermission(userId: string, actionName: string) {
    const user = await this.userService.findOne(userId);

    console.log('🚀 ~ addPermission ~ actionName:', actionName);

    const action = await this.moduleActionsRepository.findOne({
      where: { name: actionName },
    });

    if (!action) {
      throw new BadRequestException('Action not found');
    }

    const userHasAction = user.actions.some(
      (userAction) => userAction.id === action.id,
    );

    if (userHasAction) {
      return 'Ya tiene la acción';
    }

    const userAction = this.userActionsRepository.create({ user, action });
    await this.userActionsRepository.save(userAction);
    return 'Toco crear la acción';
  }

  async removePermission(userId: string, actionName: string) {
    const user = await this.userService.findOne(userId);

    console.log('🚀 ~ removePermission ~ actionName:', actionName);

    const action = await this.moduleActionsRepository.findOne({
      where: { name: actionName },
    });

    if (!action) {
      throw new BadRequestException('Action not found');
    }

    const userAction = await this.userActionsRepository.findOne({
      where: { action: { id: action.id }, user: { id: user.id } },
    });

    if (!userAction) return 'No fue necesario eliminar la acción';

    try {
      const result = await this.userActionsRepository.delete({
        id: userAction.id,
      });
      return result;
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async convertToAdminUserSeed(): Promise<
    Partial<User> & { modules: Module[] }
  > {
    const data = {
      first_name: 'demo name',
      last_name: 'demo lastName',
      email: 'demouser@example.com',
      password: '123456',
      cell_phone_number: '3001234567',
      is_active: true,
      actions: [],
    };

    const user = await this.userService.create(data);

    const actions = (await this.moduleActionsRepository.find({
      select: {
        id: true,
      },
    })) as UserActionDto[];

    return await this.userService.update(user.id, { ...user, actions });
  }

  async createUserToTests(): Promise<User> {
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

    return await this.userService.create(data);
  }

  async deleteUserToTests(id: string): Promise<void> {
    await this.userService.remove(id);
  }
}
