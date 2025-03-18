import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Response } from 'express';
import { QueryParamsDto } from '../common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from '../common/dto/remove-bulk-records.dto';
import { Supplier } from './entities/supplier.entity';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let service: SuppliersService;

  const mockSuppliersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllSuppliersWithShopping: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    removeBulk: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: mockSuppliersService,
        },
      ],
    }).compile();

    controller = module.get<SuppliersController>(SuppliersController);
    service = module.get<SuppliersService>(SuppliersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an supplier', async () => {
      const createSupplierDto: CreateSupplierDto = {
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };

      mockSuppliersService.create.mockResolvedValue(createSupplierDto);

      expect(await controller.create(createSupplierDto)).toBe(
        createSupplierDto,
      );
      expect(service.create).toHaveBeenCalledWith(createSupplierDto);
    });
  });

  describe('findAll', () => {
    it('should return array of suppliers', async () => {
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

      mockSuppliersService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(queryParams)).toBe(result);
      expect(service.findAll).toHaveBeenCalledWith(queryParams);
    });
  });

  describe('findAllSuppliersWithShopping', () => {
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

      mockSuppliersService.findAllSuppliersWithShopping.mockResolvedValue(
        result,
      );

      expect(await controller.findAllSuppliersWithShopping()).toBe(result);
    });
  });

  describe('findOne', () => {
    it('should return a single supplier', async () => {
      const id = 'some-uuid';
      const result = {
        id,
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };

      mockSuppliersService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(id)).toBe(result);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update an supplier', async () => {
      const id = 'some-uuid';
      const updateSupplierDto: UpdateSupplierDto = {
        first_name: 'Felipe',
        last_name: 'Gonzales',
      };
      const result = { id, ...updateSupplierDto };

      mockSuppliersService.update.mockResolvedValue(result);

      expect(await controller.update(id, updateSupplierDto)).toBe(result);
      expect(service.update).toHaveBeenCalledWith(id, updateSupplierDto);
    });
  });

  describe('remove', () => {
    it('should remove an supplier', async () => {
      const id = 'some-uuid';
      const result = { id };

      mockSuppliersService.remove.mockResolvedValue(result);

      expect(await controller.remove(id)).toBe(result);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('removeBulk', () => {
    it('should remove multiple suppliers', async () => {
      const removeBulkDto: RemoveBulkRecordsDto<Supplier> = {
        recordsIds: [{ id: 'id1' }, { id: 'id2' }],
      };
      const result = { success: ['id1', 'id2'], failed: [] };
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockSuppliersService.removeBulk.mockResolvedValue(result);

      await controller.removeBulk(removeBulkDto, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith(result);
    });

    it('should return 207 status when some deletions fail', async () => {
      const removeBulkDto: RemoveBulkRecordsDto<Supplier> = {
        recordsIds: [{ id: 'id1' }, { id: 'id2' }],
      };
      const result = { success: ['id1'], failed: ['id2'] };
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockSuppliersService.removeBulk.mockResolvedValue(result);

      await controller.removeBulk(removeBulkDto, response);

      expect(response.status).toHaveBeenCalledWith(207);
      expect(response.json).toHaveBeenCalledWith(result);
    });
  });
});
