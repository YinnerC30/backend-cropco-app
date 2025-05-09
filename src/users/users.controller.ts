import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Post,
  Query,
} from '@nestjs/common';

import { Auth } from 'src/auth/decorators/auth.decorator';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserDto } from './dto/user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { GetPropertyFromToken } from 'src/auth/decorators/get-property-from-user-token.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

export const pathsUsersController: PathsController = {
  createUser: {
    path: 'create',
    description: 'crear usuario',
    name: 'create_user',
  },
  findAllUsers: {
    path: 'all',
    description: 'obtener todos los usuarios',
    name: 'find_all_users',
  },
  findOneUser: {
    path: 'one/:id',
    description: 'obtener 1 usuario',
    name: 'find_one_user',
  },
  updateUser: {
    path: 'update/one/:id',
    description: 'actualizar 1 usuario',
    name: 'update_one_user',
  },
  removeUser: {
    path: 'remove/one/:id',
    description: 'eliminar 1 usuario',
    name: 'remove_one_user',
  },
  removeUsers: {
    path: 'remove/bulk',
    description: 'eliminar varios usuarios',
    name: 'remove_bulk_users',
  },
  resetPassword: {
    path: 'reset-password/one/:id',
    description: 'restablecimiento de contraseña',
    name: 'reset_password_user',
  },
  changePassword: {
    path: 'change-password/one',
    description: 'cambio de contraseña',
    name: 'change_password_user',
  },
  toggleStatusUser: {
    path: 'toggle-status/one/:id',
    description: 'cambio de estado de usuario',
    name: 'toggle_status_user',
  },
};

const {
  createUser,
  findAllUsers,
  findOneUser,
  updateUser,
  removeUser,
  removeUsers,
  resetPassword,
  changePassword,
  toggleStatusUser,
} = pathsUsersController;

@Auth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(findAllUsers.path)
  findAll(@Query() queryParams: QueryParamsDto) {
    return this.usersService.findAll(queryParams);
  }

  @Post(createUser.path)
  create(@Body() createUserDto: UserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(findOneUser.path)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Put(updateUser.path)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Put(toggleStatusUser.path)
  toggleStatusUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.toggleStatusUser(id);
  }

  @Delete(removeUser.path)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Delete(removeUsers.path)
  removeBulk(@Body() removeBulkUsersDto: RemoveBulkRecordsDto<User>) {
    return this.usersService.removeBulk(removeBulkUsersDto);
  }

  @Put(resetPassword.path)
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.resetPassword(id);
  }

  @Put(changePassword.path)
  changePassword(
    @GetPropertyFromToken('id', ParseUUIDPipe) id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(id, changePasswordDto);
  }
}
