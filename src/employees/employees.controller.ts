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
  Res,
} from '@nestjs/common';
import { QueryParams } from 'src/common/dto/QueryParams';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Employee } from './entities/employee.entity';
import { PathsController } from 'src/common/interfaces/PathsController';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Response as ResponseExpress } from 'express';
import { Auth } from 'src/auth/decorators/auth.decorator';

export const pathsEmployeesController: PathsController = {
  createEmployee: {
    path: 'create',
    description: 'crear empleado',
    name: 'create_employee',
  },
  findAllEmployees: {
    path: 'all',
    description: 'obtener todos los empleados',
    name: 'find_all_employees',
  },
  findAllEmployeesWithPendingPayments: {
    path: 'pending-payments/all',
    description: 'obtener todos los empleados con pagos pendientes',
    name: 'find_all_employees_with_pending_payments',
  },
  findAllEmployeesWithPaymentsMade: {
    path: 'made-payments/all',
    description: 'obtener todos los empleados con pagos efectuados',
    name: 'find_all_employees_with_made_payments',
  },
  findOneEmployeeWithPendingPayments: {
    path: 'pending-payments/one/:id',
    description: 'obtener los pagos pendientes de 1 empleado',
    name: 'find_one_employee_with_pending_payments',
  },
  findOneEmployee: {
    path: 'one/:id',
    description: 'obtener 1 empleado',
    name: 'find_one_employee',
  },
  updateEmployee: {
    path: 'update/one/:id',
    description: 'actualizar 1 empleado',
    name: 'update_one_employee',
  },
  removeEmployee: {
    path: 'remove/one/:id',
    description: 'eliminar 1 empleado',
    name: 'remove_one_employee',
  },
  removeEmployees: {
    path: 'remove/bulk',
    description: 'eliminar varios empleados',
    name: 'remove_bulk_employees',
  },
  findCertification: {
    path: 'find/certification/one/:id',
    description: 'obtener certificación de empleo',
    name: 'find_certification_employee',
  },
};

const {
  createEmployee,
  findAllEmployees,
  findAllEmployeesWithPendingPayments,
  findAllEmployeesWithPaymentsMade,
  findOneEmployeeWithPendingPayments,
  findOneEmployee,
  updateEmployee,
  removeEmployee,
  removeEmployees,
  findCertification,
} = pathsEmployeesController;

@Auth()
@ApiTags('Employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get(findCertification.path)
  async createCertification(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: ResponseExpress,
  ) {
    const pdfDoc = await this.employeesService.findOneCertification(id);
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = 'Employment-Letter';
    pdfDoc.pipe(response);
    pdfDoc.end();
    return;
  }

  // Crear empleado
  @Post(createEmployee.path)
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
  @Get(findAllEmployees.path)
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
  @Get(findAllEmployeesWithPendingPayments.path)
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
  // Obtener todos los pagos pendientes de los clientes
  @Get(findAllEmployeesWithPaymentsMade.path)
  // Documentación
  @ApiOperation({ summary: 'Obtener todos los empleados con pagos efectuados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de empleados con pagos efectuados obtenida', //TODO: Pendiente por implementar objeto devuelto en la respuesta
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  // Método
  findAllEmployeeWithPaymentsMade(@Query() queryParams: QueryParams) {
    return this.employeesService.findAllEmployeesWithPaymentsMade();
  }

  // Obtener información de 1 empleado
  @Get(findOneEmployee.path)
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
  @Get(findOneEmployeeWithPendingPayments.path)
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
  @Patch(updateEmployee.path)
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
  @Delete(removeEmployee.path)
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

  @Delete(removeEmployees.path)
  @ApiResponse({
    status: 200,
    description: 'Empleados eliminados exitosamente',
  })
  removeBulk(@Body() removeBulkEmployeesDto: RemoveBulkRecordsDto<Employee>) {
    return this.employeesService.removeBulk(removeBulkEmployeesDto);
  }
}
