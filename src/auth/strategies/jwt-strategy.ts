import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { Module } from '../entities/module.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Module)
    private readonly modulesRepository: Repository<Module>,

    configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }
  async validate(payload: JwtPayload): Promise<User | any> {
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
  }
}
