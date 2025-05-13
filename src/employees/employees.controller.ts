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
  UseInterceptors,
} from '@nestjs/common';

import { Response as ResponseExpress } from 'express';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { PathsController } from 'src/common/interfaces/PathsController';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';
import { Employee } from './entities/employee.entity';
import { Response } from 'express';
import { ResponseStatusInterceptor } from 'src/common/interceptors/response-status.interceptor';

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
  findAllEmployeesWithHarvests: {
    path: 'harvests/all',
    description: 'obtener los empleados con cosechas',
    name: 'find_all_employees_with_harvests',
  },
  findAllEmployeesWithWorks: {
    path: 'works/all',
    description: 'obtener los empleados con trabajos',
    name: 'find_all_employees_with_works',
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
  findTopEmployeesInHarvests: {
    path: 'find/top-employees-in-harvests',
    description: 'Obtener los 10 empleados con mayor cosechas',
    name: 'find_top_employees_in_harvests',
  },
  findTopEmployeesInWorks: {
    path: 'find/top-employees-in-works',
    description:
      'Obtener los 10 empleados con mayor participación en el trabajo',
    name: 'find_top_employees_in_works',
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
  findAllEmployeesWithHarvests,
  findAllEmployeesWithWorks,
  findTopEmployeesInHarvests,
  findTopEmployeesInWorks,
} = pathsEmployeesController;

@Auth()
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

  // Método
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  // Obtener todos los clientes
  @Get(findAllEmployees.path)

  // Método
  findAll(@Query() queryParams: QueryParamsDto) {
    return this.employeesService.findAll(queryParams);
  }

  // Obtener todos los pagos pendientes de los clientes
  @Get(findAllEmployeesWithPendingPayments.path)

  // Método
  findAllEmployeeWithPaymentsPending(@Query() queryParams: QueryParamsDto) {
    return this.employeesService.findAllEmployeesWithPaymentsPending();
  }
  // Obtener todos los pagos pendientes de los clientes
  @Get(findAllEmployeesWithPaymentsMade.path)

  // Método
  findAllEmployeeWithPaymentsMade(@Query() queryParams: QueryParamsDto) {
    return this.employeesService.findAllEmployeesWithPaymentsMade();
  }

  // Obtener información de 1 empleado
  @Get(findOneEmployee.path)
  // Documentación

  // Método
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.findOne(id);
  }

  // Obtener los pagos pendientes de 1 empleado
  @Get(findOneEmployeeWithPendingPayments.path)
  // Documentación

  // Método
  findOneEmployeeWithPaymentsPending(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.findOneEmployeeWithPaymentsPending(id);
  }

  // Actualizar la información del empleado
  @Patch(updateEmployee.path)
  // Documentación

  // Método
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  // Eliminar 1 empleado
  @Delete(removeEmployee.path)

  // Método
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.remove(id);
  }

  @Delete(removeEmployees.path)
  @UseInterceptors(ResponseStatusInterceptor)
  async removeBulk(
    @Body() removeBulkEmployeesDto: RemoveBulkRecordsDto<Employee>,
  ) {
    return await this.employeesService.removeBulk(removeBulkEmployeesDto);
  }

  @Get(findAllEmployeesWithHarvests.path)
  findAllEmployeesWithHarvests() {
    return this.employeesService.findAllEmployeesWithHarvests();
  }
  @Get(findAllEmployeesWithWorks.path)
  findAllEmployeesWithWorks() {
    return this.employeesService.findAllEmployeesWithWorks();
  }
}
