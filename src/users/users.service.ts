import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { Like, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { hashPassword } from './helpers/encrypt-password';
import { validate as uuidValidate } from 'uuid';

@Injectable()
export class UsersService {
  private readonly logger = new Logger('UsersService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const user = this.usersRepository.create(createUserDto);
      user.password = await hashPassword(user.password);
      await this.usersRepository.save(user);
      return user;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    return this.usersRepository.find({
      order: {
        first_name: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findOne(parameter: string) {
    const isUUID = uuidValidate(parameter);

    let user: User;

    if (isUUID) {
      user = await this.usersRepository.findOneBy({ id: parameter });
    } else {
      user = await this.usersRepository.findOne({
        where: [
          {
            email: Like(`${parameter}%`),
          },
        ],
      });
    }

    if (!user)
      throw new NotFoundException(`User with id: ${parameter} not found`);
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);
    try {
      await this.usersRepository.update(id, updateUserDto);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async deleteAllUsers() {
    try {
      await this.usersRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
