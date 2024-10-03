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
  createUser: { path: 'create', name: 'crear usuario' },
  getAll: { path: 'all', name: 'obtener todos los usuarios' },
  getOneUser: { path: 'one/:id', name: 'obtener 1 usuario' },
  updateUser: { path: 'update/one/:id', name: 'actualizar 1 usuario' },
  deleteUser: { path: 'delete/one/:id', name: 'eliminar 1 usuario' },
};

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('all')
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los usuarios',
    type: User,
    isArray: true,
  })
  findAll(@Query() queryParams: QueryParams) {
    return this.usersService.findAll(queryParams);
  }

  @Post('create')
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
    type: User,
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('one/:id')
  @ApiResponse({
    status: 200,
    description: 'Detalle de un usuario encontrado por ID',
    type: User,
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('update/one/:id')
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

  @Delete('delete/one/:id')
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado exitosamente',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Patch('update/actions/:id')
  updateActions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserActionsDto: UpdateUserActionsDto,
  ) {
    return this.usersService.updateActions(updateUserActionsDto);
  }
}
