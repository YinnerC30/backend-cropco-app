import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';

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

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    return this.employeeRepository.find({
      order: {
        first_name: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    const employee = await this.employeeRepository.findOneBy({ id });
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
