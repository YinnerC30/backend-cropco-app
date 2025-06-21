import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Administrator } from 'src/tenants/entities/administrator.entity';
import { Repository } from 'typeorm';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtTenantStrategy extends PassportStrategy(
  Strategy,
  'jwt-tenant',
) {
  constructor(
    @InjectRepository(Administrator)
    private tenantAdministratorRepository: Repository<Administrator>,
    private readonly configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromHeader('x-tenant-token'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<Administrator | any> {
    const { id } = payload;
    const user = await this.tenantAdministratorRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Token is not valid - Admin tenant no exist',
      );
    }
    if (!user.is_active) {
      throw new UnauthorizedException(
        'User tenant is inactive, talk with an administrator',
      );
    }

    return { ...user };
  }
}
