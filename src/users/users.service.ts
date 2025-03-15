import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Module } from 'src/auth/entities/module.entity';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';


import { DataSource, ILike, Repository } from 'typeorm';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserActionDto } from './dto/user-action.dto';
import { UserActions } from './entities/user-actions.entity';
import { User } from './entities/user.entity';
import { hashPassword } from './helpers/encrypt-password';
import { generatePassword } from './helpers/generate-password';
import { HandlerErrorService } from 'src/common/services/handler-error.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger('UsersService');

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(UserActions)
    private readonly userActionsRepository: Repository<UserActions>,

    @InjectRepository(Module)
    private readonly modulesRepository: Repository<Module>,

    private readonly handleError: HandlerErrorService,
  ) {
    this.handleError.setLogger(this.logger);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
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
      this.handleError.handle(error);
    }
  }

  async findAll(queryParams: QueryParamsDto) {
    const { query = '', limit = 10, offset = 0 } = queryParams;

    const users = await this.usersRepository.find({
      where: [
        {
          first_name: ILike(`${query}%`),
        },
        {
          email: ILike(`${query}%`),
        },
      ],
      order: {
        first_name: 'ASC',
      },
      take: limit,
      skip: offset * limit,
    });

    let count: number;
    if (query.length === 0) {
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

  async findOne(
    id: string,
    showPassword = false,
  ): Promise<Partial<User> & { modules: Module[] }> {
    const user = await this.usersRepository.findOne({
      select: {
        id: true,
        cell_phone_number: true,
        email: true,
        first_name: true,
        last_name: true,
        is_active: true,
        password: showPassword,
      },
      where: { id },
      relations: {
        actions: true,
      },
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

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Partial<User> & { modules: Module[] }> {
    await this.findOne(id);
    try {
      const { actions, ...rest } = updateUserDto;

      await this.usersRepository.update(id, rest);

      // Acciones
      await this.userActionsRepository.delete({ user: { id } });

      const actionsEntity = updateUserDto.actions.map((act: UserActionDto) => {
        return this.userActionsRepository.create({ action: act, user: { id } });
      });

      let arrayPromises = [];
      for (const element of actionsEntity) {
        arrayPromises.push(this.userActionsRepository.save(element));
      }

      await Promise.all(arrayPromises);

      return await this.findOne(id);
    } catch (error) {
      this.handleError.handle(error);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.usersRepository.delete(id);
  }

  async removeBulk(
    removeBulkUsersDto: RemoveBulkRecordsDto<User>,
  ): Promise<void> {
    for (const { id } of removeBulkUsersDto.recordsIds) {
      await this.remove(id);
    }
  }

  async deleteAllUsers() {
    try {
      await this.usersRepository.delete({});
    } catch (error) {
      this.handleError.handle(error);
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    await this.usersRepository.update(
      {
        id: userId,
      },
      { password: newPassword },
    );
  }

  async resetPassword(id: string): Promise<{ password: string }> {
    await this.findOne(id);
    const password = generatePassword();
    const encryptPassword = await hashPassword(password);
    await this.updatePassword(id, encryptPassword);
    return { password };
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { old_password, new_password } = changePasswordDto;
    const user = await this.findOne(id, true);
    const valid_password = bcrypt.compareSync(old_password, user.password);
    if (!valid_password) {
      throw new BadRequestException('Old password incorrect, retry');
    }
    const encryptPassword = await hashPassword(new_password);
    await this.updatePassword(id, encryptPassword);
  }

  async toggleStatusUser(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.update(user.id, { is_active: !user.is_active });
  }
}
