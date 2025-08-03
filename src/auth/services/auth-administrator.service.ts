import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginUserDto } from '../dto/login-user.dto';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Administrator } from 'src/administrators/entities/administrator.entity';
import { BaseAdministratorService } from './base-administrator.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class AuthAdministratorService extends BaseAdministratorService {
  protected readonly logger = new Logger('AuthAdministratorService');
  constructor(
    @Inject(REQUEST) request: Request,
    @InjectRepository(Administrator)
    private readonly administratorsRepository: Repository<Administrator>,
    private readonly jwtService: JwtService,
    private readonly handlerError: HandlerErrorService,
  ) {
    super(request);
    this.setLogger(this.logger);
  }

  private generateJwtToken(payload: JwtPayload): string {
    this.logWithContext(`Generating JWT token for administrator ID: ${payload.id}`);
    
    try {
      const token = this.jwtService.sign(payload, { expiresIn: '6h' });
      this.logWithContext(
        `JWT token generated successfully for administrator ID: ${payload.id}`,
      );
      return token;
    } catch (error) {
      this.logWithContext(
        `Failed to generate JWT token for administrator ID: ${payload.id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async login(loginUserDto: LoginUserDto) {
    this.logWithContext(`Attempting login for administrator email: ${loginUserDto.email}`);

    try {
      const user = await this.administratorsRepository.findOne({
        where: { email: loginUserDto.email },
      });

      if (!user) {
        this.logWithContext(
          `Login failed - administrator not found for email: ${loginUserDto.email}`,
          'warn',
        );
        throw new UnauthorizedException('Credentials are not valid (email)');
      }

      if (!user.is_active) {
        this.logWithContext(
          `Login failed - administrator ${user.first_name} is inactive`,
          'warn',
        );
        throw new UnauthorizedException(
          `User ${user.first_name} is inactive, talk with administrator`,
        );
      }

      if (!bcrypt.compareSync(loginUserDto.password, user.password)) {
        this.logWithContext(
          `Login failed - invalid password for administrator email: ${loginUserDto.email}`,
          'warn',
        );
        throw new UnauthorizedException('Credentials are not valid (password)');
      }

      this.logWithContext(
        `Login successful for administrator: ${user.first_name} ${user.last_name} (${loginUserDto.email})`,
      );

      delete user.password;

      return {
        ...user,
        token: this.generateJwtToken({ id: user.id }),
      };
    } catch (error) {
      this.logWithContext(
        `Login failed for administrator email: ${loginUserDto.email}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async checkAuthStatus(
    token: string,
  ): Promise<{ message: string; statusCode: number }> {
    this.logWithContext('Checking administrator authentication status');
    
    try {
      this.jwtService.verify(token);
      this.logWithContext('Administrator token validation successful');
      return {
        message: 'Token valid',
        statusCode: 200,
      };
    } catch (error: any) {
      if (error instanceof TokenExpiredError) {
        this.logWithContext('Administrator token validation failed - token expired', 'warn');
        throw new UnauthorizedException('Token has expired');
      } else {
        this.logWithContext('Administrator token validation failed - invalid token', 'warn');
        throw new UnauthorizedException('Invalid token');
      }
    }
  }
}
