import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Module } from 'src/auth/entities/module.entity';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { BaseTenantService } from 'src/common/services/base-tenant.service';
import { Repository } from 'typeorm';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserActionDto } from './dto/user-action.dto';
import { UserActions } from './entities/user-actions.entity';
import { User } from './entities/user.entity';
import { hashPassword } from './helpers/encrypt-password';
import { generatePassword } from './helpers/generate-password';
import { UserDto } from './dto/user.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class UsersService extends BaseTenantService {
  private readonly logger = new Logger('UsersService');
  private usersRepository: Repository<User>;
  private userActionsRepository: Repository<UserActions>;
  private modulesRepository: Repository<Module>;

  constructor(
    @Inject(REQUEST) request: Request,
    @InjectRepository(User) defaultUsersRepo: Repository<User>,
    @InjectRepository(UserActions) defaultActionsRepo: Repository<UserActions>,
    @InjectRepository(Module) defaultModulesRepo: Repository<Module>,
    private readonly handlerError: HandlerErrorService,
  ) {
    super(request);
    
    this.usersRepository = this.tenantConnection 
      ? this.getTenantRepository(User)
      : defaultUsersRepo;
    
    this.userActionsRepository = this.tenantConnection
      ? this.getTenantRepository(UserActions)
      : defaultActionsRepo;
    
    this.modulesRepository = this.tenantConnection
      ? this.getTenantRepository(Module)
      : defaultModulesRepo;
  }

  // Removemos el getter currentUser porque ya está disponible en BaseTenantService

  async create(createUserDto: UserDto): Promise<User> {
    this.logWithContext(`Creating new user with email: ${createUserDto.email}`);

    try {
      const user = this.usersRepository.create(createUserDto);
      user.password = await hashPassword(user.password);

      const { id } = await this.usersRepository.save(user);
      this.logWithContext(`User created successfully with ID: ${id}`);

      const actionsEntity = createUserDto.actions.map((act: UserActionDto) => {
        return this.userActionsRepository.create({ action: act, user: { id } });
      });

      await Promise.all(
        actionsEntity.map((action) => this.userActionsRepository.save(action)),
      );

      this.logWithContext(
        `User actions assigned successfully for user ID: ${id}, total actions: ${actionsEntity.length}`
      );

      delete user.password;
      return user;
    } catch (error) {
      this.logWithContext(
        `Failed to create user with email: ${createUserDto.email}`,
        'error'
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAll(queryParams: QueryParamsDto) {
    this.logWithContext(
      `Finding all users with query: "${queryParams.query || 'no query'}", limit: ${queryParams.limit || 10}, offset: ${queryParams.offset || 0}`
    );

    const { query = '', limit = 10, offset = 0 } = queryParams;

    const queryBuilder = this.usersRepository.createQueryBuilder('users');

    !!query &&
      queryBuilder
        .where('users.first_name ILIKE :query', { query: `${query}%` })
        .orWhere('users.last_name ILIKE :query', { query: `${query}%` })
        .orWhere('users.email ILIKE :query', { query: `${query}%` });

    queryBuilder.take(limit).skip(offset * limit);

    const [users, count] = await queryBuilder.getManyAndCount();

    this.logWithContext(
      `Found ${users.length} users out of ${count} total users`
    );

    if (users.length === 0 && count > 0) {
      throw new NotFoundException(
        'There are no user records with the requested pagination',
      );
    }

    return {
      total_row_count: count,
      current_row_count: users.length,
      total_page_count: Math.ceil(count / limit),
      current_page_count: offset + 1,
      records: users,
    };
  }

  async findOne(
    id: string,
    showPassword = false,
  ): Promise<Partial<User> & { modules: Module[] }> {
    this.logWithContext(
      `Finding user by ID: ${id}, showPassword: ${showPassword}`
    );

    const user = await this.usersRepository.findOne({
      select: {
        id: true,
        cell_phone_number: true,
        email: true,
        first_name: true,
        last_name: true,
        is_active: true,
        password: showPassword,
        roles: true,
      },
      where: { id },
      relations: {
        actions: true,
      },
    });

    if (!user) {
      this.logWithContext(`User with ID: ${id} not found`, 'warn');
      throw new NotFoundException(`User with id: ${id} not found`);
    }

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

    this.logWithContext(
      `User found successfully with ID: ${id}, modules count: ${userActions.length}`
    );

    return {
      ...user,
      modules: userActions,
    };
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    ignoreAdmin = false,
  ): Promise<Partial<User> & { modules: Module[] }> {
    this.logWithContext(`Updating user with ID: ${id}, ignoreAdmin: ${ignoreAdmin}`);

    const user = await this.findOne(id);
    if (user.roles.includes('admin') && !ignoreAdmin) {
      this.logWithContext(`Attempt to update admin user with ID: ${id} was blocked`, 'warn');
      throw new ForbiddenException('You cannot update an admin user');
    }

    try {
      const { actions = [], ...rest } = updateUserDto;

      await this.usersRepository.update(id, rest);
      this.logWithContext(`User basic information updated successfully for ID: ${id}`);

      // Acciones
      await this.userActionsRepository.delete({ user: { id } });

      const actionsEntity = actions.map((act: UserActionDto) => {
        return this.userActionsRepository.create({ action: act, user: { id } });
      });

      await Promise.all(
        actionsEntity.map((action) => this.userActionsRepository.save(action)),
      );

      this.logWithContext(
        `User actions updated successfully for ID: ${id}, new actions count: ${actionsEntity.length}`
      );

      return await this.findOne(id);
    } catch (error) {
      this.logWithContext(`Failed to update user with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string): Promise<void> {
    this.logWithContext(`Attempting to remove user with ID: ${id}`);

    const { roles } = await this.findOne(id);

    if (roles.includes('admin')) {
      this.logWithContext(`Attempt to delete admin user with ID: ${id} was blocked`, 'warn');
      throw new ForbiddenException('You cannot delete an admin user');
    }

    await this.usersRepository.delete(id);
    this.logWithContext(`User with ID: ${id} removed successfully`);
  }

  async removeBulk(removeBulkUsersDto: RemoveBulkRecordsDto<User>) {
    this.logWithContext(`Starting bulk removal of ${removeBulkUsersDto.recordsIds.length} users`);

    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const { id } of removeBulkUsersDto.recordsIds) {
      try {
        await this.remove(id);
        success.push(id);
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }

    this.logWithContext(`Bulk removal completed. Success: ${success.length}, Failed: ${failed.length}`);

    return { success, failed };
  }

  async deleteAllUsers() {
    this.logWithContext('Deleting ALL users - this is a destructive operation', 'warn');

    try {
      await this.usersRepository.delete({});
      this.logWithContext('All users deleted successfully');
    } catch (error) {
      this.logWithContext('Failed to delete all users', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  private async updatePassword(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    await this.usersRepository.update(
      {
        id: userId,
      },
      { password: newPassword },
    );
  }

  async resetPassword(id: string): Promise<{ password: string }> {
    this.logWithContext(`Resetting password for user ID: ${id}`);

    const user = await this.findOne(id);
    if (user.roles.includes('admin')) {
      this.logWithContext(`Attempt to reset password for admin user with ID: ${id} was blocked`, 'warn');
      throw new ForbiddenException(
        'You cannot reset the password of an admin user',
      );
    }

    const password = generatePassword();
    const encryptPassword = await hashPassword(password);
    await this.updatePassword(id, encryptPassword);

    this.logWithContext(`Password reset successfully for user ID: ${id}`);

    return { password };
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    this.logWithContext(`Changing password for user ID: ${id}`);

    const { old_password, new_password } = changePasswordDto;
    const user = await this.findOne(id, true);
    const valid_password = bcrypt.compareSync(old_password, user.password);

    if (!valid_password) {
      this.logWithContext(`Failed password change attempt for user ID: ${id} - incorrect old password`, 'warn');
      throw new BadRequestException('Old password incorrect, retry');
    }

    const encryptPassword = await hashPassword(new_password);
    await this.updatePassword(id, encryptPassword);

    this.logWithContext(`Password changed successfully for user ID: ${id}`);
  }

  async toggleStatusUser(id: string): Promise<void> {
    this.logWithContext(`Toggling status for user ID: ${id}`);

    const user = await this.findOne(id);

    if (user.roles.includes('admin')) {
      this.logWithContext(`Attempt to toggle status for admin user with ID: ${id} was blocked`, 'warn');
      throw new ForbiddenException(
        'You cannot change the status of an admin user',
      );
    }

    await this.usersRepository.update(user.id, { is_active: !user.is_active });

    this.logWithContext(
      `Status toggled successfully for user ID: ${id}, new status: ${!user.is_active ? 'active' : 'inactive'}`
    );
  }
}
