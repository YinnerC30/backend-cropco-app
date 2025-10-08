import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { Request } from 'express';
import { Administrator } from 'src/administrators/entities/administrator.entity';
import { Repository } from 'typeorm';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAdministrationStrategy extends PassportStrategy(
  Strategy,
  'jwt-administration',
) {
  constructor(
    @InjectRepository(Administrator)
    private tenantAdministratorRepository: Repository<Administrator>,
    private readonly configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => {
          return request?.cookies?.['administrator-token'];
        },
      ]),
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
        'Token is not valid - Admin cropco user no exist',
      );
    }
    if (!user.is_active) {
      throw new UnauthorizedException(
        'Administration cropco user is inactive, talk with an system administrator',
      );
    }

    return { ...user };
  }
}
