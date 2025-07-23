import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';

import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { PrinterService } from 'src/printer/printer.service';
import { WorkDetails } from 'src/work/entities/work-details.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';
import { getEmploymentLetterByIdReport } from './reports/employment-letter-by-id.report';

import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { BaseTenantService } from 'src/common/services/base-tenant.service';
import { QueryForYearDto } from 'src/common/dto/query-for-year.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { EmployeeCertificationDto } from './dto/employee-certification.dto';

@Injectable()
export class EmployeesService extends BaseTenantService {
  protected readonly logger = new Logger('EmployeesService');
  private employeeRepository: Repository<Employee>;

  constructor(
    @Inject(REQUEST) request: Request,
    private readonly printerService: PrinterService,
    private readonly handlerError: HandlerErrorService,
  ) {
    super(request);
    this.setLogger(this.logger);
    this.employeeRepository = this.getTenantRepository(Employee);
  }

  async generateCertification(
    id: string,
    employeeCertificationDto: EmployeeCertificationDto,
  ) {
    this.logWithContext(
      `Generating employment certification for employee ID: ${id}`,
    );

    try {
      const employee = await this.findOne(id);

      const docDefinition = getEmploymentLetterByIdReport({
        employerName: employeeCertificationDto.generator_name,
        employerPosition: employeeCertificationDto.generator_position,
        employeeName: employee.first_name + ' ' + employee.last_name,
        employeePosition: employeeCertificationDto.employee_position,
        employeeStartDate: employeeCertificationDto.start_date,
        employeeHours: employeeCertificationDto.weekly_working_hours,
        employeeWorkSchedule: 'Lunes a Viernes',
        employerCompany: employeeCertificationDto.company_name,
        employeeId: employeeCertificationDto.id_number,
      });

      const doc = this.printerService.createPdf({ docDefinition });
      this.logWithContext(
        `Employment certification generated successfully for employee ID: ${id}`,
      );

      return doc;
    } catch (error) {
      this.logWithContext(
        `Failed to generate employment certification for employee ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async create(createEmployeeDto: CreateEmployeeDto) {
    this.logWithContext(
      `Creating new employee with email: ${createEmployeeDto.email}`,
    );

    try {
      const employee = this.employeeRepository.create(createEmployeeDto);
      const savedEmployee = await this.employeeRepository.save(employee);

      this.logWithContext(
        `Employee created successfully with ID: ${savedEmployee.id}`,
      );
      return savedEmployee;
    } catch (error) {
      this.logWithContext(
        `Failed to create employee with email: ${createEmployeeDto.email}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAll(queryParams: QueryParamsDto) {
    this.logWithContext(
      `Finding all employees with query: "${queryParams.query || 'no query'}", limit: ${queryParams.limit || 10}, offset: ${queryParams.offset || 0}, all_records: ${queryParams.all_records || false}`,
    );

    try {
      const {
        query = '',
        limit = 10,
        offset = 0,
        all_records = false,
      } = queryParams;

      const queryBuilder =
        this.employeeRepository.createQueryBuilder('employees');

      !!query &&
        !all_records &&
        queryBuilder
          .where('employees.first_name ILIKE :query', { query: `${query}%` })
          .orWhere('employees.last_name ILIKE :query', { query: `${query}%` })
          .orWhere('employees.email ILIKE :query', { query: `${query}%` });

      !all_records && queryBuilder.take(limit).skip(offset * limit);

      const [employees, count] = await queryBuilder.getManyAndCount();

      this.logWithContext(
        `Found ${employees.length} employees out of ${count} total employees`,
      );

      if (employees.length === 0 && count > 0) {
        throw new NotFoundException(
          'There are no employee records with the requested pagination',
        );
      }

      return {
        total_row_count: count,
        current_row_count: employees.length,
        total_page_count: all_records ? 1 : Math.ceil(count / limit),
        current_page_count: all_records ? 1 : offset + 1,
        records: employees,
      };
    } catch (error) {
      this.logWithContext(
        `Failed to find employees with query: "${queryParams.query || 'no query'}"`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllEmployeesWithPaymentsPending() {
    this.logWithContext('Finding all employees with pending payments');

    try {
      const [employees, count] = await this.employeeRepository.findAndCount({
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
        where: [
          {
            harvests_detail: {
              payment_is_pending: true,
            },
          },
          {
            works_detail: {
              payment_is_pending: true,
            },
          },
        ],
      });

      this.logWithContext(
        `Found ${employees.length} employees with pending payments`,
      );

      return {
        total_row_count: count,
        current_row_count: employees.length,
        total_page_count: 1,
        current_page_count: 1,
        records: employees,
      };
    } catch (error) {
      this.logWithContext(
        'Failed to find employees with pending payments',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllEmployeesWithPaymentsMade() {
    this.logWithContext('Finding all employees with payments made');

    try {
      const [employees, count] = await this.employeeRepository
        .createQueryBuilder('employee')
        .withDeleted()
        .leftJoinAndSelect('employee.payments', 'payments')
        .where('payments.id IS NOT NULL')
        .select([
          'employee.id',
          'employee.first_name',
          'employee.last_name',
          'payments',
        ])
        .getManyAndCount();

      this.logWithContext(
        `Found ${employees.length} employees with payments made`,
      );

      return {
        total_row_count: count,
        current_row_count: employees.length,
        total_page_count: 1,
        current_page_count: 1,
        records: employees,
      };
    } catch (error) {
      this.logWithContext(
        'Failed to find employees with payments made',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOneEmployeeWithPaymentsPending(id: string) {
    this.logWithContext(`Finding employee with pending payments for ID: ${id}`);

    try {
      const employee = await this.employeeRepository
        .createQueryBuilder('employee')
        .withDeleted()
        .leftJoinAndSelect(
          'employee.harvests_detail',
          'harvests_detail',
          'harvests_detail.payment_is_pending = :pending',
        )
        .leftJoinAndSelect(
          'employee.works_detail',
          'works_detail',
          'works_detail.payment_is_pending = :pending',
        )
        .leftJoinAndSelect('harvests_detail.harvest', 'harvest')
        .leftJoinAndSelect('works_detail.work', 'work')
        .where('employee.id = :id', { id })
        .andWhere(
          '(harvests_detail.payment_is_pending = :pending OR works_detail.payment_is_pending = :pending)',
          { pending: true },
        )
        .getOne();

      if (!employee) {
        this.logWithContext(
          `Employee with pending payments not found for ID: ${id}`,
          'warn',
        );
        throw new NotFoundException(`Employee with id: ${id} not found`);
      }

      this.logWithContext(
        `Employee with pending payments found successfully for ID: ${id}`,
      );
      return employee;
    } catch (error) {
      this.logWithContext(
        `Failed to find employee with pending payments for ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllEmployeesWithHarvests() {
    this.logWithContext('Finding all employees with harvests');

    try {
      const [employees, count] = await this.employeeRepository.findAndCount({
        relations: {
          harvests_detail: true,
        },
        where: {
          harvests_detail: MoreThan(0),
        },
      });

      this.logWithContext(`Found ${employees.length} employees with harvests`);

      return {
        total_row_count: count,
        current_row_count: employees.length,
        total_page_count: 1,
        current_page_count: 1,
        records: employees,
      };
    } catch (error) {
      this.logWithContext('Failed to find employees with harvests', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllEmployeesWithWorks() {
    this.logWithContext('Finding all employees with works');

    try {
      const [employees, count] = await this.employeeRepository.findAndCount({
        relations: {
          works_detail: true,
        },
        where: {
          works_detail: MoreThan(0),
        },
      });

      this.logWithContext(`Found ${employees.length} employees with works`);

      return {
        total_row_count: count,
        current_row_count: employees.length,
        total_page_count: 1,
        current_page_count: 1,
        records: employees,
      };
    } catch (error) {
      this.logWithContext('Failed to find employees with works', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOne(id: string) {
    this.logWithContext(`Finding employee by ID: ${id}`);

    try {
      const employee = await this.employeeRepository.findOne({
        where: { id },
        relations: {
          harvests_detail: { harvest: true },
          payments: { employee: true },
          works_detail: { work: true },
        },
        order: {
          works_detail: {
            work: { date: 'DESC' },
          },
          harvests_detail: {
            harvest: {
              date: 'DESC',
            },
          },
          payments: {
            date: 'DESC',
          },
        },
      });

      if (!employee) {
        this.logWithContext(`Employee with ID: ${id} not found`, 'warn');
        throw new NotFoundException(`Employee with id: ${id} not found`);
      }

      this.logWithContext(`Employee found successfully with ID: ${id}`);
      return employee;
    } catch (error) {
      this.logWithContext(`Failed to find employee with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    this.logWithContext(`Updating employee with ID: ${id}`);

    try {
      await this.findOne(id);
      await this.employeeRepository.update(id, updateEmployeeDto);
      const updatedEmployee = await this.findOne(id);

      this.logWithContext(`Employee updated successfully with ID: ${id}`);
      return updatedEmployee;
    } catch (error) {
      this.logWithContext(`Failed to update employee with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    this.logWithContext(`Attempting to remove employee with ID: ${id}`);

    try {
      const employee = await this.findOne(id);

      if (
        employee.harvests_detail.some(
          (item: HarvestDetails) => item.payment_is_pending === true,
        )
      ) {
        this.logWithContext(
          `Cannot remove employee with ID: ${id} - has unpaid harvests`,
          'warn',
        );
        throw new ConflictException(
          `Employee with id ${employee.id} cannot be removed, has unpaid harvests`,
        );
      }

      if (
        employee.works_detail.some(
          (item: WorkDetails) => item.payment_is_pending === true,
        )
      ) {
        this.logWithContext(
          `Cannot remove employee with ID: ${id} - has unpaid works`,
          'warn',
        );
        throw new ConflictException(
          `Employee with id ${employee.id} cannot be removed, has unpaid works`,
        );
      }

      await this.employeeRepository.softRemove(employee);
      this.logWithContext(`Employee with ID: ${id} removed successfully`);
    } catch (error) {
      this.logWithContext(`Failed to remove employee with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulk(removeBulkEmployeesDto: RemoveBulkRecordsDto<Employee>) {
    this.logWithContext(
      `Starting bulk removal of ${removeBulkEmployeesDto.recordsIds.length} employees`,
    );

    try {
      const success: string[] = [];
      const failed: { id: string; error: string }[] = [];

      for (const { id } of removeBulkEmployeesDto.recordsIds) {
        try {
          await this.remove(id);
          success.push(id);
        } catch (error) {
          failed.push({ id, error: error.message });
        }
      }

      this.logWithContext(
        `Bulk removal completed. Success: ${success.length}, Failed: ${failed.length}`,
      );

      return { success, failed };
    } catch (error) {
      this.logWithContext(
        'Failed to execute bulk removal of employees',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async deleteAllEmployees() {
    this.logWithContext(
      'Deleting ALL employees - this is a destructive operation',
      'warn',
    );

    try {
      await this.employeeRepository.delete({});
      this.logWithContext('All employees deleted successfully');
    } catch (error) {
      this.logWithContext('Failed to delete all employees', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  // Gráficos

  async findTopEmployeesInHarvests({
    year = new Date().getFullYear(),
  }: QueryForYearDto) {
    this.logWithContext(`Finding top employees in harvests for year: ${year}`);

    try {
      const employees = await this.employeeRepository.query(
        `
        SELECT hd."employeeId" as id,
               emp.first_name,
               emp.last_name,
               CAST(SUM(convert_to_grams(hd.unit_of_measure::TEXT, hd.amount::NUMERIC)) AS INTEGER) AS total_harvests_amount,
               CAST(SUM(hd.value_pay) AS INTEGER) AS total_value_pay
        FROM harvests_detail hd
        JOIN harvests h ON hd."harvestId" = h.id
        JOIN employees emp ON hd."employeeId" = emp.id
        WHERE EXTRACT(YEAR FROM h.date) = $1
        GROUP BY hd."employeeId", emp.first_name, emp.last_name
        ORDER BY total_harvests_amount DESC
        LIMIT 5
      `,
        [year],
      );

      const count = employees.length;

      this.logWithContext(
        `Found ${count} top employees in harvests for year: ${year}`,
      );

      return {
        total_row_count: count,
        current_row_count: count,
        total_page_count: count > 0 ? 1 : 0,
        current_page_count: count > 0 ? 1 : 0,
        records: employees,
      };
    } catch (error) {
      this.logWithContext(
        `Failed to find top employees in harvests for year: ${year}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findTopEmployeesInWorks({
    year = new Date().getFullYear(),
  }: QueryForYearDto) {
    this.logWithContext(`Finding top employees in works for year: ${year}`);

    try {
      const employees = await this.employeeRepository.query(
        `
          SELECT wd."employeeId" as id,
                 emp.first_name,
                 emp.last_name,
                 CAST(COUNT(wd.id) AS INTEGER)      AS total_works,
                 CAST(SUM(wd.value_pay) AS INTEGER) AS total_value_pay
          FROM works_detail wd
                   JOIN works w ON wd."workId" = w.id
                   JOIN employees emp ON wd."employeeId" = emp.id
          WHERE EXTRACT(YEAR FROM w.date) = $1
          GROUP BY wd."employeeId", emp.first_name, emp.last_name
          ORDER BY total_works DESC
          LIMIT 5
        `,
        [year],
      );

      const count = employees.length;

      this.logWithContext(
        `Found ${count} top employees in works for year: ${year}`,
      );

      return {
        total_row_count: count,
        current_row_count: count,
        total_page_count: count > 0 ? 1 : 0,
        current_page_count: count > 0 ? 1 : 0,
        records: employees,
      };
    } catch (error) {
      this.logWithContext(
        `Failed to find top employees in works for year: ${year}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }
}
