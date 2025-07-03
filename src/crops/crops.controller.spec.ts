import { Test, TestingModule } from '@nestjs/testing';
import { CropsController } from './crops.controller';
import { CropsService } from './crops.service';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Crop } from './entities/crop.entity';

describe('CropsController', () => {
  let controller: CropsController;
  let service: CropsService;

  const mockCropsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    removeBulk: jest.fn(),
    findAllCropsWithStock: jest.fn(),
    findAllWithHarvest: jest.fn(),
    findAllWithSales: jest.fn(),
    findAllWithWork: jest.fn(),
    findAllWithConsumptions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CropsController],
      providers: [{ provide: CropsService, useValue: mockCropsService }],
    }).compile();

    controller = module.get<CropsController>(CropsController);
    service = module.get<CropsService>(CropsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a crop', async () => {
      const createCropDto: CreateCropDto = {
        name: 'Wheat',
        description: 'Test crop',
        units: 0,
        location: '',
        date_of_creation: '',
        date_of_termination: '',
        number_hectares: 12
      };
      const result = { id: '1', ...createCropDto } as Crop;
      jest.spyOn(service, 'create').mockResolvedValue(result);

      expect(await controller.create(createCropDto)).toEqual(result);
      expect(service.create).toHaveBeenCalledWith(createCropDto);
    });
  });

  describe('findAll', () => {
    it('should return all crops', async () => {
      const queryParams: QueryParamsDto = { offset: 1, limit: 10 };
      const result = {
        total_row_count: 1,
        current_row_count: 1,
        total_page_count: 1,
        current_page_count: 1,
        records: [{ id: '1', name: 'Wheat' }] as Crop[],
      };
      jest.spyOn(service, 'findAll').mockResolvedValue(result);

      expect(await controller.findAll(queryParams)).toEqual(result);
      expect(service.findAll).toHaveBeenCalledWith(queryParams);
    });
  });

  describe('findOne', () => {
    it('should return a single crop', async () => {
      const id = '1';
      const result = { id, name: 'Wheat' } as Crop;
      jest.spyOn(service, 'findOne').mockResolvedValue(result);

      expect(await controller.findOne(id)).toEqual(result);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a crop', async () => {
      const id = '1';
      const updateCropDto: UpdateCropDto = { name: 'Updated Wheat' };
      const result = { id, ...updateCropDto } as Crop;
      jest.spyOn(service, 'update').mockResolvedValue(result);

      expect(await controller.update(id, updateCropDto)).toEqual(result);
      expect(service.update).toHaveBeenCalledWith(id, updateCropDto);
    });
  });

  describe('remove', () => {
    it('should remove a crop', async () => {
      const id = '1';
      jest.spyOn(service, 'remove').mockResolvedValue();
      await controller.remove(id);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('removeBulk', () => {
    it('should remove multiple crops', async () => {
      const removeBulkDto: RemoveBulkRecordsDto<any> = {
        recordsIds: [{ id: '1' }, { id: '2' }],
      };
      const result = { success: ['1'], failed: [] };
      jest.spyOn(service, 'removeBulk').mockResolvedValue(result);

      await controller.removeBulk(removeBulkDto);

      expect(service.removeBulk).toHaveBeenCalledWith(removeBulkDto);
    });
  });

  describe('findAllCropsWithStock', () => {
    it('should return all crops with stock', async () => {
      const result = {
        total_row_count: 1,
        current_row_count: 1,
        total_page_count: 1,
        current_page_count: 1,
        records: [{ id: '1', name: 'Rice', stock: 100 }],
      };
      jest.spyOn(service, 'findAllCropsWithStock').mockResolvedValue(result);

      expect(await controller.findAllHarvestStock()).toEqual(result);
      expect(service.findAllCropsWithStock).toHaveBeenCalled();
    });
  });

  describe('findAllWithHarvest', () => {
    it('should return all crops with harvest', async () => {
      const queryParams: QueryParamsDto = { offset: 1, limit: 10 };
      const result = {
        total_row_count: 1,
        current_row_count: 1,
        total_page_count: 1,
        records: [{ id: '1', name: 'Rice' }] as Crop[],
      };
      jest.spyOn(service, 'findAllWithHarvest').mockResolvedValue(result);

      expect(await controller.findAllWithHarvest(queryParams)).toEqual(result);
      expect(service.findAllWithHarvest).toHaveBeenCalledWith(queryParams);
    });
  });

  describe('findAllWithSales', () => {
    it('should return all crops with sales', async () => {
      const result = {
        total_row_count: 1,
        current_row_count: 1,
        total_page_count: 1,
        records: [{ id: '1', name: 'Rice' }] as Crop[],
      };
      jest.spyOn(service, 'findAllWithSales').mockResolvedValue(result);

      expect(await controller.findAllWithSales()).toEqual(result);
      expect(service.findAllWithSales).toHaveBeenCalled();
    });
  });

  describe('findAllWithWork', () => {
    it('should return all crops with work', async () => {
      const result = {
        total_row_count: 1,
        current_row_count: 1,
        total_page_count: 1,
        records: [{ id: '1', name: 'Rice' }] as Crop[],
      };
      jest.spyOn(service, 'findAllWithWork').mockResolvedValue(result);

      expect(await controller.findAllWithWork()).toEqual(result);
      expect(service.findAllWithWork).toHaveBeenCalled();
    });
  });

  describe('findAllCropsWithConsumptions', () => {
    it('should return all crops with consumptions', async () => {
      const result = {
        total_row_count: 1,
        current_row_count: 1,
        total_page_count: 1,
        records: [{ id: '1', name: 'Rice' }] as Crop[],
      };
      jest.spyOn(service, 'findAllWithConsumptions').mockResolvedValue(result);

      expect(await controller.findAllCropsWithConsumptions()).toEqual(result);
      expect(service.findAllWithConsumptions).toHaveBeenCalled();
    });
  });
});
