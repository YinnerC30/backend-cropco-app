import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryParams } from 'src/common/dto/QueryParams';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { ILike, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { hashPassword } from './helpers/encrypt-password';
import { AuthService } from 'src/auth/auth.service';
import { UpdateUserActionsDto } from './dto/update-user-actions.dto';

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

  async findAll(queryParams: QueryParams) {
    const { search = '', limit = 10, offset = 0 } = queryParams;

    const users = await this.usersRepository.find({
      where: [
        {
          first_name: ILike(`${search}%`),
        },
        {
          email: ILike(`${search}%`),
        },
      ],
      order: {
        first_name: 'ASC',
      },
      take: limit,
      skip: offset * limit,
    });

    let count: number;
    if (search.length === 0) {
      count = await this.usersRepository.count();
    } else {
      count = users.length;
    }

    return {
      rowCount: count,
      rows: users,
      pageCount: Math.ceil(count / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOneBy({ id });

    if (!user) throw new NotFoundException(`User with id: ${id} not found`);
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

  async updateActions(updateUserActionsDto: UpdateUserActionsDto) {
    console.log(updateUserActionsDto);
  }
}
