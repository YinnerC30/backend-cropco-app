import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from 'src/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt-strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Module as ModuleCropco } from './entities/module.entity';
import { ModuleActions } from './entities/module-actions.entity';
import { User } from 'src/users/entities/user.entity';
import { UserActions } from 'src/users/entities/user-actions.entity';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  imports: [
    ConfigModule,
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get('JWT_SECRET'),
          signOptions: {
            expiresIn: '30s',
          },
        };
      },
    }),
    TypeOrmModule.forFeature([
      Role,
      ModuleCropco,
      ModuleActions,
      User,
      UserActions,
    ]),
  ],
  exports: [JwtStrategy, PassportModule, JwtModule, TypeOrmModule],
})
export class AuthModule {}
