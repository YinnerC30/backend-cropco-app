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
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { ChangePasswordDto } from 'src/users/dto/change-password.dto';
import { hashPassword } from 'src/users/helpers/encrypt-password';
import { generatePassword } from 'src/users/helpers/generate-password';
import { Repository } from 'typeorm';
import { CreateAdministradorDto } from './dto/create-administrator.dto';
import { UpdateAdministradorDto } from './dto/update-administrator.dto';
import { Administrator } from './entities/administrator.entity';
import { BaseAdministratorService } from 'src/auth/services/base-administrator.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class AdministratorsService extends BaseAdministratorService {
  protected readonly logger = new Logger('AdministratorsService');
  constructor(
    @Inject(REQUEST) request: Request,
    @InjectRepository(Administrator)
    private AdministratorsRepository: Repository<Administrator>,

    private readonly handlerError: HandlerErrorService,
  ) {
    super(request);
    this.setLogger(this.logger);
  }

  async createAdmin(tenantAdministradorDto: CreateAdministradorDto) {
    this.logWithContext(
      `Creating new administrator with email: ${tenantAdministradorDto.email}`,
    );

    try {
      const tenantAdmin = this.AdministratorsRepository.create(
        tenantAdministradorDto,
      );

      tenantAdmin.password = await hashPassword(tenantAdmin.password);

      await this.AdministratorsRepository.save(tenantAdmin);

      delete tenantAdmin.password;

      this.logWithContext(
        `Administrator created successfully: ${tenantAdmin.first_name} ${tenantAdmin.last_name} (${tenantAdmin.email})`,
      );

      return tenantAdmin;
    } catch (error) {
      this.logWithContext(
        `Failed to create administrator with email: ${tenantAdministradorDto.email}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllAdmin(queryParams: QueryParamsDto) {
    const { offset = 0, limit = 10, query = '' } = queryParams;

    this.logWithContext(
      `Searching administrators with query: "${query}", offset: ${offset}, limit: ${limit}`,
    );

    try {
      const queryBuilder =
        this.AdministratorsRepository.createQueryBuilder('administrators');

      queryBuilder
        .where('administrators.first_name ILIKE :query', {
          query: `${query}%`,
        })
        .orWhere('administrators.last_name ILIKE :query', {
          query: `${query}%`,
        })
        .orWhere('administrators.email ILIKE :query', {
          query: `${query}%`,
        });

      queryBuilder.take(limit).skip(offset * limit);

      const [tenantAdmins, count] = await queryBuilder.getManyAndCount();

      this.logWithContext(
        `Found ${count} administrators matching query: "${query}"`,
      );

      return {
        total_row_count: count,
        current_row_count: tenantAdmins.length,
        total_page_count: Math.ceil(count / limit),
        current_page_count: offset + 1,
        records: tenantAdmins,
      };
    } catch (error) {
      this.logWithContext(
        `Failed to search administrators with query: "${query}"`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOneAdmin(id: string, showPassword = false) {
    this.logWithContext(
      `Searching administrator with ID: ${id}, showPassword: ${showPassword}`,
    );

    try {
      const tenantAdmin = await this.AdministratorsRepository.findOne({
        select: {
          id: true,
          cell_phone_number: true,
          email: true,
          first_name: true,
          last_name: true,
          is_active: true,
          password: showPassword,
          role: true,
        },
        where: { id },
      });

      if (!tenantAdmin) {
        this.logWithContext(`Administrator not found with ID: ${id}`, 'warn');
        throw new NotFoundException(`Tenant admin with ID ${id} not found`);
      }

      this.logWithContext(
        `Administrator found: ${tenantAdmin.first_name} ${tenantAdmin.last_name} (${tenantAdmin.email})`,
      );

      return tenantAdmin;
    } catch (error) {
      this.logWithContext(
        `Failed to find administrator with ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async updateAdmin(
    id: string,
    tenantAdministradorDto: UpdateAdministradorDto,
  ) {
    this.logWithContext(`Updating administrator with ID: ${id}`);

    try {
      const tenantAdmin = await this.findOneAdmin(id);

      if (tenantAdmin.role === 'admin') {
        this.logWithContext(
          `Update failed - cannot update admin role user with ID: ${id}`,
          'warn',
        );
        throw new BadRequestException('Admin cannot be updated');
      }

      Object.assign(tenantAdmin, tenantAdministradorDto);
      const updatedAdmin =
        await this.AdministratorsRepository.save(tenantAdmin);

      this.logWithContext(
        `Administrator updated successfully: ${updatedAdmin.first_name} ${updatedAdmin.last_name} (ID: ${id})`,
      );

      return updatedAdmin;
    } catch (error) {
      this.logWithContext(
        `Failed to update administrator with ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeAdmin(id: string) {
    this.logWithContext(`Removing administrator with ID: ${id}`);

    try {
      const tenantAdmin = await this.findOneAdmin(id);

      if (tenantAdmin.role === 'admin') {
        this.logWithContext(
          `Remove failed - cannot delete admin role user with ID: ${id}`,
          'warn',
        );
        throw new BadRequestException('Admin cannot be deleted');
      }

      const removedAdmin =
        await this.AdministratorsRepository.softRemove(tenantAdmin);

      this.logWithContext(
        `Administrator removed successfully: ${tenantAdmin.first_name} ${tenantAdmin.last_name} (ID: ${id})`,
      );

      return removedAdmin;
    } catch (error) {
      this.logWithContext(
        `Failed to remove administrator with ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  private async updatePassword(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    this.logWithContext(`Updating password for administrator ID: ${userId}`);

    try {
      await this.AdministratorsRepository.update(
        {
          id: userId,
        },
        { password: newPassword },
      );

      this.logWithContext(
        `Password updated successfully for administrator ID: ${userId}`,
      );
    } catch (error) {
      this.logWithContext(
        `Failed to update password for administrator ID: ${userId}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async resetPassword(id: string): Promise<{ password: string }> {
    this.logWithContext(`Resetting password for administrator ID: ${id}`);

    try {
      const user = await this.findOneAdmin(id);

      if (user.role === 'admin') {
        this.logWithContext(
          `Password reset failed - cannot reset admin role user password (ID: ${id})`,
          'warn',
        );
        throw new ForbiddenException(
          'You cannot reset the password of an admin user',
        );
      }

      const password = generatePassword();
      const encryptPassword = await hashPassword(password);
      await this.updatePassword(id, encryptPassword);

      this.logWithContext(
        `Password reset successfully for administrator: ${user.first_name} ${user.last_name} (ID: ${id})`,
      );

      return { password };
    } catch (error) {
      this.logWithContext(
        `Failed to reset password for administrator ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    this.logWithContext(`Changing password for administrator ID: ${id}`);

    try {
      const { old_password, new_password } = changePasswordDto;
      const user = await this.findOneAdmin(id, true);

      const valid_password = bcrypt.compareSync(old_password, user.password);
      if (!valid_password) {
        this.logWithContext(
          `Password change failed - old password incorrect for administrator ID: ${id}`,
          'warn',
        );
        throw new BadRequestException('Old password incorrect, retry');
      }

      const encryptPassword = await hashPassword(new_password);
      await this.updatePassword(id, encryptPassword);

      this.logWithContext(
        `Password changed successfully for administrator: ${user.first_name} ${user.last_name} (ID: ${id})`,
      );
    } catch (error) {
      this.logWithContext(
        `Failed to change password for administrator ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async toggleStatusAdmin(id: string): Promise<void> {
    this.logWithContext(`Toggling status for administrator ID: ${id}`);

    try {
      const tenantAdmin = await this.findOneAdmin(id);

      if (tenantAdmin.role === 'admin') {
        this.logWithContext(
          `Status toggle failed - cannot change admin role user status (ID: ${id})`,
          'warn',
        );
        throw new ForbiddenException(
          'You cannot change the status of an admin user',
        );
      }

      const newStatus = !tenantAdmin.is_active;

      await this.AdministratorsRepository.update(tenantAdmin.id, {
        is_active: newStatus,
      });

      this.logWithContext(
        `Status toggled successfully for administrator: ${tenantAdmin.first_name} ${tenantAdmin.last_name} (ID: ${id}), new status: ${newStatus ? 'active' : 'inactive'}`,
      );
    } catch (error) {
      this.logWithContext(
        `Failed to toggle status for administrator ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }
}
