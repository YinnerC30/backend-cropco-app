import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginUserDto } from '../dto/login-user.dto';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Administrator } from 'src/tenants/entities/administrator.entity';
import { Repository } from 'typeorm';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthTenantService {
  private readonly logger = new Logger('AuthTenantService');
  constructor(
    @InjectRepository(Administrator)
    private readonly tenantAdministratorRepository: Repository<Administrator>,
    private readonly jwtService: JwtService,
    private readonly handlerError: HandlerErrorService,
  ) {}

  private generateJwtToken(payload: JwtPayload): string {
    const token = this.jwtService.sign(payload, { expiresIn: '6h' });
    return token;
  }
  async login(loginUserDto: LoginUserDto) {
    const user = await this.tenantAdministratorRepository.findOne({
      where: { email: loginUserDto.email },
    });

    if (!user) {
      throw new NotFoundException(
        `Tenant user with email ${loginUserDto.email} not found`,
      );
    }

    if (!user.is_active) {
      throw new UnauthorizedException(
        `User ${user.first_name} is inactive, talk with administrator`,
      );
    }
    // console.log('🚀 ~ AuthTenantService ~ login ~ loginUserDto:', loginUserDto);
    // console.log('🚀 ~ AuthTenantService ~ login ~ user:', user);

    if (!bcrypt.compareSync(loginUserDto.password, user.password))
      throw new UnauthorizedException('Credentials are not valid (password)');

    delete user.password;

    return {
      ...user,
      token: this.generateJwtToken({ id: user.id }),
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
        throw new UnauthorizedException('Token has expired');
      } else {
        throw new UnauthorizedException('Invalid token');
      }
    }
  }
}
