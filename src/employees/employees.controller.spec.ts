import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Response } from 'express';
import { QueryParamsDto } from '../common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from '../common/dto/remove-bulk-records.dto';
import { Employee } from './entities/employee.entity';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let service: EmployeesService;

  const mockEmployeesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    removeBulk: jest.fn(),
    findOneCertification: jest.fn(),
    findAllEmployeesWithPaymentsPending: jest.fn(),
    findAllEmployeesWithPaymentsMade: jest.fn(),
    findOneEmployeeWithPaymentsPending: jest.fn(),
    findAllEmployeesWithHarvests: jest.fn(),
    findAllEmployeesWithWorks: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: mockEmployeesService,
        },
      ],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
    service = module.get<EmployeesService>(EmployeesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an employee', async () => {
      const createEmployeeDto: CreateEmployeeDto = {
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };

      mockEmployeesService.create.mockResolvedValue(createEmployeeDto);

      expect(await controller.create(createEmployeeDto)).toBe(
        createEmployeeDto,
      );
      expect(service.create).toHaveBeenCalledWith(createEmployeeDto);
    });
  });

  describe('findAll', () => {
    it('should return array of employees', async () => {
      const queryParams: QueryParamsDto = { offset: 1, limit: 10 };
      const result = {
        total_row_count: 1,
        current_row_count: 1,
        total_page_count: 1,
        current_page_count: 1,
        records: [
          {
            first_name: 'Daniel',
            last_name: 'Gomez',
            email: 'daniel@gmail.com',
            cell_phone_number: '3146652134',
            address: 'Dirección de prueba...',
          },
        ],
      };

      mockEmployeesService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(queryParams)).toBe(result);
      expect(service.findAll).toHaveBeenCalledWith(queryParams);
    });
  });

  describe('findOne', () => {
    it('should return a single employee', async () => {
      const id = 'some-uuid';
      const result = {
        id,
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };

      mockEmployeesService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(id)).toBe(result);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update an employee', async () => {
      const id = 'some-uuid';
      const updateEmployeeDto: UpdateEmployeeDto = {
        first_name: 'Felipe',
        last_name: 'Gonzales',
      };
      const result = { id, ...updateEmployeeDto };

      mockEmployeesService.update.mockResolvedValue(result);

      expect(await controller.update(id, updateEmployeeDto)).toBe(result);
      expect(service.update).toHaveBeenCalledWith(id, updateEmployeeDto);
    });
  });

  describe('remove', () => {
    it('should remove an employee', async () => {
      const id = 'some-uuid';
      const result = { id };

      mockEmployeesService.remove.mockResolvedValue(result);

      expect(await controller.remove(id)).toBe(result);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('removeBulk', () => {
    it('should remove multiple employees', async () => {
      const removeBulkDto: RemoveBulkRecordsDto<Employee> = {
        recordsIds: [{ id: 'id1' }, { id: 'id2' }],
      };
      const result = { success: ['id1', 'id2'], failed: [] };
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockEmployeesService.removeBulk.mockResolvedValue(result);

      // await controller.removeBulk(removeBulkDto);
      expect(await controller.removeBulk(removeBulkDto)).toBe(result);
      expect(service.removeBulk).toHaveBeenCalledWith(removeBulkDto);
    });

    it('should return 207 status when some deletions fail', async () => {
      const removeBulkDto: RemoveBulkRecordsDto<Employee> = {
        recordsIds: [{ id: 'id1' }, { id: 'id2' }],
      };
      const result = { success: ['id1'], failed: ['id2'] };
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockEmployeesService.removeBulk.mockResolvedValue(result);

      expect(await controller.removeBulk(removeBulkDto)).toBe(result);
      expect(service.removeBulk).toHaveBeenCalledWith(removeBulkDto);
    });
  });

  describe('findAllEmployeesWithHarvests', () => {
    it('should return employees with harvests', async () => {
      const result = [
        {
          first_name: 'Daniel',
          last_name: 'Gomez',
          email: 'daniel@gmail.com',
          cell_phone_number: '3146652134',
          address: 'Dirección de prueba...',
        },
      ];

      mockEmployeesService.findAllEmployeesWithHarvests.mockResolvedValue(
        result,
      );

      expect(await controller.findAllEmployeesWithHarvests()).toBe(result);
    });
  });

  describe('findAllEmployeesWithWorks', () => {
    it('should return employees with works', async () => {
      const result = [
        {
          first_name: 'Daniel',
          last_name: 'Gomez',
          email: 'daniel@gmail.com',
          cell_phone_number: '3146652134',
          address: 'Dirección de prueba...',
        },
      ];

      mockEmployeesService.findAllEmployeesWithWorks.mockResolvedValue(result);

      expect(await controller.findAllEmployeesWithWorks()).toBe(result);
    });
  });
});
