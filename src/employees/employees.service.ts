import {
  ConflictException,
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
import { QueryForYearDto } from 'src/common/dto/query-for-year.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger('EmployeesService');

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly printerService: PrinterService,
    private readonly handlerError: HandlerErrorService,
  ) {}

  async findOneCertification(id: string) {
    const employee = await this.findOne(id);

    const docDefinition = getEmploymentLetterByIdReport({
      employerName: 'Carlos',
      employerPosition: 'Gerente de RRHH',
      employeeName: employee.first_name,
      employeePosition: 'Jornalero',
      employeeStartDate: new Date(),
      employeeHours: 48,
      employeeWorkSchedule: 'Lunes a Viernes',
      employerCompany: 'Cropco Corp.',
    });
    const doc = this.printerService.createPdf({ docDefinition });
    return doc;
  }

  async create(createEmployeeDto: CreateEmployeeDto) {
    try {
      const employee = this.employeeRepository.create(createEmployeeDto);
      await this.employeeRepository.save(employee);
      return employee;
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAll(queryParams: QueryParamsDto) {
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
  }

  async findAllEmployeesWithPaymentsPending() {
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

    return {
      total_row_count: count,
      current_row_count: employees.length,
      total_page_count: 1,
      current_page_count: 1,
      records: employees,
    };
  }

  async findAllEmployeesWithPaymentsMade() {
    const [employees, count] = await this.employeeRepository
      .createQueryBuilder('employee')
      .withDeleted()
      .leftJoinAndSelect('employee.payments', 'payments')
      .where('payments.id IS NOT NULL') // Filtrar solo empleados con pagos
      .select([
        'employee.id',
        'employee.first_name',
        'employee.last_name',
        'payments', // Si quieres incluir información de los pagos
      ])
      .getManyAndCount();

    return {
      total_row_count: count,
      current_row_count: employees.length,
      total_page_count: 1,
      current_page_count: 1,
      records: employees,
    };
  }
  async findOneEmployeeWithPaymentsPending(id: string) {
    const employee = await this.employeeRepository.findOne({
      withDeleted: true,
      where: [
        {
          id,
          harvests_detail: { payment_is_pending: true },
        },
        {
          id,
          works_detail: { payment_is_pending: true },
        },
      ],
      relations: {
        harvests_detail: { harvest: true },
        works_detail: { work: true },
      },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with id: ${id} not found`);
    }

    return employee;
  }

  async findAllEmployeesWithHarvests() {
    const [employees, count] = await this.employeeRepository.findAndCount({
      relations: {
        harvests_detail: true,
      },
      where: {
        harvests_detail: MoreThan(0),
      },
    });
    return {
      total_row_count: count,
      current_row_count: employees.length,
      total_page_count: 1,
      current_page_count: 1,
      records: employees,
    };
  }
  async findAllEmployeesWithWorks() {
    const [employees, count] = await this.employeeRepository.findAndCount({
      relations: {
        works_detail: true,
      },
      where: {
        works_detail: MoreThan(0),
      },
    });
    return {
      total_row_count: count,
      current_row_count: employees.length,
      total_page_count: 1,
      current_page_count: 1,
      records: employees,
    };
  }

  async findOne(id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: {
        harvests_detail: { harvest: true },
        payments: true,
        works_detail: { work: true },
      },
    });
    if (!employee)
      throw new NotFoundException(`Employee with id: ${id} not found`);
    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    await this.findOne(id);
    try {
      await this.employeeRepository.update(id, updateEmployeeDto);
      return await this.findOne(id);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    const employee = await this.findOne(id);

    if (
      employee.harvests_detail.some(
        (item: HarvestDetails) => item.payment_is_pending === true,
      )
    ) {
      throw new ConflictException(
        `Employee with id ${employee.id} cannot be removed, has unpaid harvests`,
      );
    }

    if (
      employee.works_detail.some(
        (item: WorkDetails) => item.payment_is_pending === true,
      )
    ) {
      throw new ConflictException(
        `Employee with id ${employee.id} cannot be removed, has unpaid works`,
      );
    }

    await this.employeeRepository.softRemove(employee);
  }

  async removeBulk(removeBulkEmployeesDto: RemoveBulkRecordsDto<Employee>) {
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

    return { success, failed }; // Retorna un resumen de las operaciones
  }

  async deleteAllEmployees() {
    try {
      await this.employeeRepository.delete({});
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  // Gráficos

  async findTopEmployeesInHarvests({
    year = new Date().getFullYear(),
  }: QueryForYearDto) {
    const employees = await this.employeeRepository.query(
      `
      SELECT hd."employeeId" as id,
             emp.first_name,
             emp.last_name,
             SUM(convert_to_grams(hd.unit_of_measure::TEXT, hd.amount::NUMERIC)) AS total_harvests_amount,
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

    return {
      total_row_count: count,
      current_row_count: count,
      total_page_count: count > 0 ? 1 : 0,
      current_page_count: count > 0 ? 1 : 0,
      records: employees,
    };
  }
  async findTopEmployeesInWorks({
    year = new Date().getFullYear(),
  }: QueryForYearDto) {
    const employees = await this.employeeRepository.query(
      `
        SELECT wd."employeeId",
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

    return {
      total_row_count: count,
      current_row_count: count,
      total_page_count: count > 0 ? 1 : 0,
      current_page_count: count > 0 ? 1 : 0,
      records: employees,
    };
  }
}
