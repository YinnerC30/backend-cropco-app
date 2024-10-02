import { Injectable, UnauthorizedException } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Module)
    private readonly modulesRepository: Repository<Module>,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginUserDto: LoginUserDto) {
    const { password, email } = loginUserDto;
    const user = await this.usersRepository.findOne({
      where: { email },
      select: { email: true, password: true, id: true },
    });
    if (!user)
      throw new UnauthorizedException('Credentials are not valid (email)');

    if (!bcrypt.compareSync(password, user.password))
      throw new UnauthorizedException('Credentials are not valid (password)');

    delete user.password;
    return { ...user, token: this.getJwtToken({ id: user.id }) };
  }

  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }

  async renewToken({ token }: CheckAuthStatusDto) {
    const { id } = this.jwtService.verify(token);
    const newToken = this.jwtService.sign({ id });
    return {
      token: newToken,
    };
  }

  async checkAuthStatus({ token }: CheckAuthStatusDto) {
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

  async getAllPermits() {
    const users = await this.usersRepository.find({
      relations: {
        actions: {
          action: true,
        },
      },
      order: {
        first_name: 'ASC',
      },
      take: 3,
    });

    const roles = await this.rolesRepository.find({
      relations: {
        actions: true,
      },
    });

    return {
      users,
      roles,
    };
  }

  async getModulePermits() {
    const modules = this.modulesRepository.find({
      relations: {
        actions: true,
      },
    });

    return modules;
  }

  async getUserPermits() {
    const idUser = '01410f6e-7dc0-4c53-9bfa-63fd187778d4';

    const userPermits1 = await this.modulesRepository.find({
      select: {
        name: true,
        actions: {
          id: true,
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
              id: idUser,
            },
          },
        },
      },
    });

    const userPermits2 = await this.usersRepository.find({
      relations: {
        actions: {
          action: {
            module: true,
          },
        },
      },
      where: {
        id: idUser,
      },
    });

    return { userPermits1, userPermits2 };
  }
}
