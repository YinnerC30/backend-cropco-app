import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ModuleActions } from 'src/auth/entities/module-actions.entity';
import { Module } from 'src/auth/entities/module.entity';
import { QueryParams } from 'src/common/dto/QueryParams';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { DataSource, ILike, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserActionsDto } from './dto/update-user-actions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserActions } from './entities/user-actions.entity';
import { User } from './entities/user.entity';
import { hashPassword } from './helpers/encrypt-password';
import { RemoveBulkUsersDto } from './dto/remove-bulk-users.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger('UsersService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(UserActions)
    private readonly userActionsRepository: Repository<UserActions>,

    @InjectRepository(Module)
    private readonly modulesRepository: Repository<Module>,

    @InjectRepository(ModuleActions)
    private readonly moduleActionsRepository: Repository<ModuleActions>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const user = this.usersRepository.create(createUserDto);
      user.password = await hashPassword(user.password);

      const { id } = await this.usersRepository.save(user);

      const actionsEntity = createUserDto.actions.map((act: any) => {
        return this.userActionsRepository.create({ action: act, user: { id } });
      });

      for (const element of actionsEntity) {
        await this.userActionsRepository.save(element);
      }

      return user;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(queryParams: QueryParams) {
    const { search = '', limit = 10, offset = 0 } = queryParams;

    const users = await this.usersRepository.find({
      where: [
        {
          first_name: ILike(`${search}%`),
        },
        {
          email: ILike(`${search}%`),
        },
      ],
      order: {
        first_name: 'ASC',
      },
      take: limit,
      skip: offset * limit,
    });

    let count: number;
    if (search.length === 0) {
      count = await this.usersRepository.count();
    } else {
      count = users.length;
    }

    return {
      rowCount: count,
      rows: users,
      pageCount: Math.ceil(count / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });
    if (!user) throw new NotFoundException(`User with id: ${id} not found`);

    const userActions = await this.modulesRepository.find({
      select: {
        name: true,
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
              id,
            },
          },
        },
      },
    });

    return {
      ...user,
      modules: userActions,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);
    try {
      const { actions, ...rest } = updateUserDto;

      await this.usersRepository.update(id, rest);

      // Acciones
      await this.userActionsRepository.delete({ user: { id } });

      const actionsEntity = updateUserDto.actions.map((act: any) => {
        return this.userActionsRepository.create({ action: act, user: { id } });
      });

      let arrayPromises = [];
      for (const element of actionsEntity) {
        arrayPromises.push(this.userActionsRepository.save(element));
      }

      await Promise.all(arrayPromises);

      return await this.findOne(id);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const { modules, ...user } = await this.findOne(id);
    await this.usersRepository.remove(user as User);
  }

  async removeBulk(removeBulkUsersDto: RemoveBulkUsersDto) {
    for (const { id } of removeBulkUsersDto.userIds) {
      await this.remove(id);
    }
  }

  async deleteAllUsers() {
    try {
      await this.usersRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async updateActions(id: string, updateUserActionsDto: UpdateUserActionsDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.findOne(id);

      await queryRunner.manager.delete(UserActions, {
        user: id,
      });

      for (const action of updateUserActionsDto.actions) {
        const moduleAction = await queryRunner.manager.findOne(ModuleActions, {
          where: { id: action.id },
        });

        if (!moduleAction) {
          throw new BadRequestException(
            `Module Action with Id ${action.id} not exist`,
          );
        }

        const userActionEntity = queryRunner.manager.create(UserActions, {
          action: { id: action.id },
          user: { id },
        });

        await queryRunner.manager.save(UserActions, userActionEntity);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }
}
