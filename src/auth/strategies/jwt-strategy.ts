import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Module } from '../entities/module.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Module)
    private modulesRepository: Repository<Module>,
    private readonly configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromExtractors([
        // ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => {
          return request?.cookies?.['user-token'];
        },
      ]),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload): Promise<User | any> {
    try {
      this.userRepository = request['tenantConnection'].getRepository(User);
      this.modulesRepository =
        request['tenantConnection'].getRepository(Module);

      const { id } = payload;
      const user = await this.userRepository.findOne({
        where: { id },
      });

      const userPermits = await this.modulesRepository.find({
        select: {
          name: true,
          actions: {
            id: true,
            description: true,
            path_endpoint: true,
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

      if (!user) {
        throw new UnauthorizedException('Token is not valid - User no exist');
      }
      if (!user.is_active) {
        throw new UnauthorizedException(
          'User is inactive, talk with an administrator',
        );
      }

      return { ...user, modules: userPermits };
    } catch (error) {
      console.log('Hubo un error en la strategy de los usuarios normales');
    }
  }
}
