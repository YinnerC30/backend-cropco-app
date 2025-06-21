import {
  BadRequestException,
  ForbiddenException,
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

@Injectable()
export class AdministratorsService {
  private readonly logger = new Logger('AdministratorsService');
  constructor(
    @InjectRepository(Administrator)
    private AdministratorsRepository: Repository<Administrator>,

    private readonly handlerError: HandlerErrorService,
  ) {}

  async createAdmin(tenantAdministradorDto: CreateAdministradorDto) {
    // Crear el tenant
    try {
      const tenantAdmin = this.AdministratorsRepository.create(
        tenantAdministradorDto,
      );

      tenantAdmin.password = await hashPassword(tenantAdmin.password);

      await this.AdministratorsRepository.save(tenantAdmin);

      delete tenantAdmin.password;

      return tenantAdmin;
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllAdmin(queryParams: QueryParamsDto) {
    const { offset = 0, limit = 10, query = '' } = queryParams;

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

    const [tenantAdmins, count] = await queryBuilder.getManyAndCount();

    return {
      total_row_count: count,
      current_row_count: tenantAdmins.length,
      total_page_count: Math.ceil(count / limit),
      current_page_count: offset + 1,
      records: tenantAdmins,
    };
  }

  async findOneAdmin(id: string, showPassword = false) {
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
      throw new NotFoundException(`Tenant admin with ID ${id} not found`);
    }

    return tenantAdmin;
  }

  async updateAdmin(
    id: string,
    tenantAdministradorDto: UpdateAdministradorDto,
  ) {
    const tenantAdmin = await this.findOneAdmin(id);
    if (tenantAdmin.role === 'admin') {
      throw new BadRequestException('Admin cannot be updated');
    }
    try {
      Object.assign(tenantAdmin, tenantAdministradorDto);
      return this.AdministratorsRepository.save(tenantAdmin);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeAdmin(id: string) {
    const tenantAdmin = await this.findOneAdmin(id);
    if (tenantAdmin.role === 'admin') {
      throw new BadRequestException('Admin cannot be deleted');
    }
    try {
      return this.AdministratorsRepository.softRemove(tenantAdmin);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  private async updatePassword(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    await this.AdministratorsRepository.update(
      {
        id: userId,
      },
      { password: newPassword },
    );
  }

  async resetPassword(id: string): Promise<{ password: string }> {
    const user = await this.findOneAdmin(id);
    if (user.role === 'admin') {
      throw new ForbiddenException(
        'You cannot reset the password of an admin user',
      );
    }
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
    const user = await this.findOneAdmin(id, true);
    const valid_password = bcrypt.compareSync(old_password, user.password);
    if (!valid_password) {
      throw new BadRequestException('Old password incorrect, retry');
    }
    const encryptPassword = await hashPassword(new_password);
    await this.updatePassword(id, encryptPassword);
  }

  async toggleStatusAdmin(id: string): Promise<void> {
    const tenantAdmin = await this.findOneAdmin(id);

    if (tenantAdmin.role === 'admin') {
      throw new ForbiddenException(
        'You cannot change the status of an admin user',
      );
    }
    await this.AdministratorsRepository.update(tenantAdmin.id, {
      is_active: !tenantAdmin.is_active,
    });
  }
}
