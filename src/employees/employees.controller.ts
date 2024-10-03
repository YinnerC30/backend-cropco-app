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
import { QueryParams } from 'src/common/dto/QueryParams';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Employee } from './entities/employee.entity';
import { PathsController } from 'src/common/interfaces/PathsController';

export const pathsEmployeesController: PathsController = {
  create: {
    path: 'create',
    name: 'crear empleado',
  },
  getAll: {
    path: 'all',
    name: 'obtener todos los empleados',
  },
  getAllPendingPayments: {
    path: 'pending-payments/all',
    name: 'obtener todos los empleados con pagos pendientes',
  },
  getOneEmployeePendingPayments: {
    path: 'pending-payments/one/:id',
    name: 'obtener los pagos pendientes de 1 empleado',
  },
  getOne: {
    path: 'one/:id',
    name: 'obtener 1 empleado',
  },
  updateEmployee: {
    path: 'update/one/:id',
    name: 'actualizar 1 empleado',
  },
  deleteEmployee: {
    path: 'delete/one/:id',
    name: 'eliminar 1 empleado',
  },
};

@ApiTags('Employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // Crear empleado
  @Post('create')
  // Documentación
  @ApiOperation({ summary: 'Crear un nuevo empleado' })
  @ApiResponse({
    status: 201,
    description: 'Empleado creado',
    type: CreateEmployeeDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  // Obtener todos los clientes
  @Get('all')
  // Documentación
  @ApiOperation({ summary: 'Obtener todos los empleados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de empleados obtenida',
    type: [CreateEmployeeDto],
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  findAll(@Query() queryParams: QueryParams) {
    return this.employeesService.findAll(queryParams);
  }

  // Obtener todos los pagos pendientes de los clientes
  @Get('pending-payments/all')
  // Documentación
  @ApiOperation({ summary: 'Obtener todos los empleados con pagos pendientes' })
  @ApiResponse({
    status: 200,
    description: 'Lista de empleados con pagos pendientes obtenida', //TODO: Pendiente por implementar objeto devuelto en la respuesta
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  findAllEmployeeWithPaymentsPending(@Query() queryParams: QueryParams) {
    return this.employeesService.findAllEmployeesWithPaymentsPending();
  }

  // Obtener información de 1 empleado
  @Get('one/:id')
  // Documentación
  @ApiOperation({ summary: 'Obtener un empleado por su ID' })
  @ApiResponse({
    status: 200,
    description: 'Empleado encontrado',
    type: Employee,
  })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.findOne(id);
  }

  // Obtener los pagos pendientes de 1 empleado
  @Get('pending-payments/one/:id')
  // Documentación
  @ApiOperation({
    summary: 'Obtener un empleado con pagos pendientes por su ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Empleado encontrado con pagos pendientes',
  })
  @ApiResponse({ status: 400, description: 'ID inválido' }) //TODO: Pendiente por implementar Objeto de respuesta a solicitud
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  findOneEmployeeWithPaymentsPending(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.findOneEmployeeWithPaymentsPending(id);
  }

  // Actualizar la información del empleado
  @Patch('update/one/:id')
  // Documentación
  @ApiOperation({ summary: 'Actualizar los datos de un empleado' })
  @ApiResponse({ status: 200, description: 'Empleado actualizado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  // Eliminar 1 empleado
  @Delete('delete/one/:id')
  // Documentación
  @ApiOperation({ summary: 'Eliminar un empleado' })
  @ApiResponse({ status: 200, description: 'Empleado eliminado' })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.remove(id);
  }
}
