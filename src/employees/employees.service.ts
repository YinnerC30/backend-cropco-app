import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { DataSource, ILike, MoreThan, Repository } from 'typeorm';

import { QueryParams } from 'src/common/dto/QueryParams';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { PrinterService } from 'src/printer/printer.service';
import { WorkDetails } from 'src/work/entities/work-details.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';
import { getEmploymentLetterByIdReport } from './reports/employment-letter-by-id.report';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger('EmployeesService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly dataSource: DataSource,
    private readonly printerService: PrinterService,
  ) {}

  async findOneCertification(id: string) {
    const employee = await this.findOne(id);

    const docDefinition = getEmploymentLetterByIdReport({
      employerName: 'Sofonias',
      employerPosition: 'Gerente de RRHH',
      employeeName: employee.first_name,
      employeePosition: 'Jornalero',
      employeeStartDate: new Date(),
      employeeHours: 48,
      employeeWorkSchedule: 'Lunes a Viernes',
      employerCompany: 'Cropco Corp.',
    });
    const doc = this.printerService.createPdf(docDefinition);
    return doc;
  }

  async create(createEmployeeDto: CreateEmployeeDto) {
    try {
      const employee = this.employeeRepository.create(createEmployeeDto);
      await this.employeeRepository.save(employee);
      return employee;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(queryParams: QueryParams) {
    const {
      query = '',
      limit = 10,
      offset = 0,
      allRecords = false,
    } = queryParams;

    let employees: Employee[];

    if (allRecords === true) {
      employees = await this.employeeRepository.find({
        where: [
          {
            first_name: ILike(`${query}%`),
          },
          {
            email: ILike(`${query}%`),
          },
        ],
        order: {
          first_name: 'ASC',
        },
      });
    } else {
      employees = await this.employeeRepository.find({
        where: [
          {
            first_name: ILike(`${query}%`),
          },
          {
            email: ILike(`${query}%`),
          },
        ],
        order: {
          first_name: 'ASC',
        },
        take: limit,
        skip: offset * limit,
      });
    }

    let count: number;
    if (query.length === 0) {
      count = await this.employeeRepository.count();
    } else {
      count = employees.length;
    }

    return {
      rowCount: count,
      rows: employees,
      pageCount: Math.ceil(count / limit),
    };
  }

  async findAllEmployeesWithPaymentsPending() {
    const employees = await this.employeeRepository.find({
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
      rowCount: employees.length,
      rows: employees,
    };
  }

  async findAllEmployeesWithPaymentsMade() {
    const employees = await this.employeeRepository
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
      .getMany();

    return {
      rowCount: employees.length,
      rows: employees,
    };
  }
  async findOneEmployeeWithPaymentsPending(id: string) {
    const employee = await this.employeeRepository.findOne({
      withDeleted: true,
      where: { id },
      relations: {
        harvests_detail: { harvest: true },
        works_detail: { work: true },
      },
    });
    if (!employee)
      throw new NotFoundException(`Employee with id: ${id} not found`);
    return {
      ...employee,
      harvests_detail: employee.harvests_detail.filter(
        (item: HarvestDetails) => item.payment_is_pending === true,
      ),
      works_detail: employee.works_detail.filter(
        (item: WorkDetails) => item.payment_is_pending === true,
      ),
    };
  }

  async findAllEmployeesWithHarvests() {
    const employees = await this.employeeRepository.find({
      relations: {
        harvests_detail: true,
      },
      where: {
        harvests_detail: MoreThan(0),
      },
    });
    return {
      rowCount: employees.length,
      rows: employees,
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
    } catch (error) {
      this.handleDBExceptions(error);
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
        'Cannot remove employee with harvests pending payment',
      );
    }

    if (
      employee.works_detail.some(
        (item: WorkDetails) => item.payment_is_pending === true,
      )
    ) {
      throw new ConflictException(
        'Cannot remove employee with works pending payment',
      );
    }

    await this.employeeRepository.softRemove(employee);
  }

  async removeBulk(removeBulkEmployeesDto: RemoveBulkRecordsDto<Employee>) {
    for (const { id } of removeBulkEmployeesDto.recordsIds) {
      await this.remove(id);
    }
  }

  async deleteAllEmployees() {
    try {
      await this.employeeRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
