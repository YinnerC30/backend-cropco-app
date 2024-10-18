import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { QueryParams } from 'src/common/dto/QueryParams';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { PathsController } from 'src/common/interfaces/PathsController';
import { UpdateUserActionsDto } from './dto/update-user-actions.dto';

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
  // updateActions: {
  //   path: 'update/actions/one/:id',
  //   description: 'actualizar acciones de 1 usuario',
  //   name: 'update_actions_one_user',
  // },
};

const {
  createUser,
  findAllUsers,
  findOneUser,
  updateUser,
  removeUser,
  updateActions,
} = pathsUsersController;

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(findAllUsers.path)
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los usuarios',
    type: User,
    isArray: true,
  })
  findAll(@Query() queryParams: QueryParams) {
    return this.usersService.findAll(queryParams);
  }

  @Post(createUser.path)
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
    type: User,
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(findOneUser.path)
  @ApiResponse({
    status: 200,
    description: 'Detalle de un usuario encontrado por ID',
    type: User,
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(updateUser.path)
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
    type: User,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(removeUser.path)
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado exitosamente',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  // @Patch(updateActions.path)
  // updateActions(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Body() updateUserActionsDto: UpdateUserActionsDto,
  // ) {
  //   return this.usersService.updateActions(id, updateUserActionsDto);
  // }
}
