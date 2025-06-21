import { forwardRef, Module } from '@nestjs/common';
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
import { CommonModule } from 'src/common/common.module';
import { AuthTenantService } from './services/auth-tenant.service';
import { Administrator } from 'src/tenants/entities/administrator.entity';
import { JwtTenantStrategy } from './strategies/jwt-tenant-strategy';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy,JwtTenantStrategy, AuthTenantService],
  imports: [
    ConfigModule,
    forwardRef(() => UsersModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get('JWT_SECRET'),
          signOptions: {
            expiresIn: '6h',
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
      Administrator,
    ]),
    CommonModule,
  ],
  exports: [JwtStrategy,JwtTenantStrategy, PassportModule, JwtModule, TypeOrmModule, AuthService],
})
export class AuthModule {}
