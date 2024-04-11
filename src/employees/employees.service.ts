import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { ILike, Repository } from 'typeorm';

import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';
import { QueryParams } from 'src/common/dto/QueryParams';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger('EmployeesService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

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
      search = '',
      limit = 10,
      offset = 0,
      allRecords = false,
    } = queryParams;

    let employees;

    if (allRecords === true) {
      employees = await this.employeeRepository.find({
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
      });
    } else {
      employees = await this.employeeRepository.find({
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
    }

    let count: number;
    if (search.length === 0) {
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

  async findOne(id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: { harvests_detail: true, payments: true, works: true },
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
    await this.employeeRepository.remove(employee);
  }

  async deleteAllEmployees() {
    try {
      await this.employeeRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
