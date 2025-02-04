import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/entities/user.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { CheckAuthStatusDto } from './dto/check-status.dto';
import { Role } from './entities/role.entity';
import { Module } from './entities/module.entity';
import { pathsClientsController } from 'src/clients/clients.controller';
import { pathsCropsController } from 'src/crops/crops.controller';
import { pathsEmployeesController } from 'src/employees/employees.controller';
import { pathsHarvestsController } from 'src/harvest/harvest.controller';
import { pathsPaymentsController } from 'src/payments/payments.controller';
import { pathsSalesController } from 'src/sales/sales.controller';
import { pathsSuppliersController } from 'src/suppliers/suppliers.controller';
import { pathsSuppliesController } from 'src/supplies/supplies.controller';
import { pathsUsersController } from 'src/users/users.controller';
import { pathsWorksController } from 'src/work/work.controller';
import { ModuleActions } from './entities/module-actions.entity';
import { pathsAuthController } from './auth.controller';
import { UsersService } from 'src/users/users.service';
import { UserActionDto } from 'src/users/dto/user-action.dto';
import { pathsConsumptionController } from 'src/consumptions/consumptions.controller';
import { pathsShoppingController } from 'src/shopping/shopping.controller';
import { pathsDashboardController } from 'src/dashboard/dashboard.controller';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Module)
    private readonly modulesRepository: Repository<Module>,
    @InjectRepository(ModuleActions)
    private readonly moduleActionsRepository: Repository<ModuleActions>,
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
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
      token: this.getJwtToken({ id: user.id }),
    };
  }

  private getJwtToken(payload: JwtPayload): string {
    const token = this.jwtService.sign(payload);
    return token;
  }

  async renewToken(token: string): Promise<{ token: string }> {
    const { id } = this.jwtService.verify(token);
    const newToken = this.jwtService.sign({ id });
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

  async createModuleWithActions(): Promise<void> {
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

    return await this.userService.update(id, { ...user, actions });
  }

  async convertToAdminUserSeed(): Promise<
    Partial<User> & { modules: Module[] }
  > {
    const data = {
      first_name: 'demo name',
      last_name: 'demo lastname',
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
}
