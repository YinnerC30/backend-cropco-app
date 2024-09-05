import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { CheckAuthStatusDto } from './dto/check-status.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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
}
