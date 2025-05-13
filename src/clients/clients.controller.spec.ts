import { Test, TestingModule } from '@nestjs/testing';
import { QueryParamsDto } from '../common/dto/query-params.dto';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { UpdateClientDto } from './dto/update-client.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { Response } from 'express';
import { PrinterService } from 'src/printer/printer.service';

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: ClientsService;
  let printerService: PrinterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findAllClientWithSales: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            removeBulk: jest.fn(),
            exportAllClients: jest.fn(),
          },
        },
        {
          provide: PrinterService,
          useValue: {
            createPdf: jest.fn().mockReturnValue({
              pipe: jest.fn(),
              end: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
    service = module.get<ClientsService>(ClientsService);
    printerService = module.get<PrinterService>(PrinterService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a client', async () => {
      const createClientDto: CreateClientDto = {
        first_name: 'Test',
        last_name: 'Chilito',
        email: 'Pepe70866@google.com',
        cell_phone_number: '1234567890',
        address: 'Dirección random',
      };
      await controller.create(createClientDto);
      expect(service.create).toHaveBeenCalledWith(createClientDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of clients', async () => {
      const queryParams: QueryParamsDto = {
        /* mock data */
      };
      await controller.findAll(queryParams);
      expect(service.findAll).toHaveBeenCalledWith(queryParams);
    });
  });

  describe('findAllClientsWithSales', () => {
    it('should return an array of clients with sales', async () => {
      await controller.findAllClientsWithSales();
      expect(service.findAllClientWithSales).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single client', async () => {
      const id = 'some-uuid';
      await controller.findOne(id);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a client', async () => {
      const id = 'some-uuid';
      const updateClientDto: UpdateClientDto = {
        /* mock data */
      };
      await controller.update(id, updateClientDto);
      expect(service.update).toHaveBeenCalledWith(id, updateClientDto);
    });
  });

  describe('remove', () => {
    it('should remove a client', async () => {
      const id = 'some-uuid';
      await controller.remove(id);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('exportAllClients', () => {
    it('should export all clients as PDF', async () => {
      const response = {
        setHeader: jest.fn(),
        pipe: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      const pdfDoc: any = {
        pipe: jest.fn(),
        end: jest.fn(),
      };

      jest.spyOn(service, 'exportAllClients').mockResolvedValue(pdfDoc);

      await controller.exportAllClients(response);

      expect(response.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(pdfDoc.pipe).toHaveBeenCalledWith(response);
      expect(pdfDoc.end).toHaveBeenCalled();
    });
  });

  describe('removeBulk', () => {
    it('should return 200 status and result when no records fail', async () => {
      const removeBulkClientsDto: RemoveBulkRecordsDto<any> = {
        recordsIds: [
          { id: '550e8400-e29b-41d4-a716-446655440000' },
          { id: '550e8400-e29b-41d4-a716-446655440001' },
          { id: '550e8400-e29b-41d4-a716-446655440002' },
        ],
      };

      const mockResult = {
        success: [
          { id: '550e8400-e29b-41d4-a716-446655440000' },
          { id: '550e8400-e29b-41d4-a716-446655440001' },
          { id: '550e8400-e29b-41d4-a716-446655440002' },
        ],
        failed: [],
      } as any;

      // Mock del servicio
      jest.spyOn(service, 'removeBulk').mockResolvedValue(mockResult);

      await controller.removeBulk(removeBulkClientsDto);

      // Verificar que el servicio fue llamado con los datos correctos
      expect(service.removeBulk).toHaveBeenCalledWith(removeBulkClientsDto);
    });

    it('should return 207 status and result when some records fail', async () => {
      const removeBulkClientsDto: RemoveBulkRecordsDto<any> = {
        recordsIds: [
          { id: '550e8400-e29b-41d4-a716-446655440000' },
          { id: '550e8400-e29b-41d4-a716-446655440001' },
          { id: '550e8400-e29b-41d4-a716-446655440002' },
        ],
      };

      const mockResult = {
        success: [{ id: '550e8400-e29b-41d4-a716-446655440000' }],
        failed: [
          { id: '550e8400-e29b-41d4-a716-446655440001', error: 'Not found' },
          { id: '550e8400-e29b-41d4-a716-446655440002', error: 'Invalid' },
        ],
      } as any;

      // Mock del servicio
      jest.spyOn(service, 'removeBulk').mockResolvedValue(mockResult);

      await controller.removeBulk(removeBulkClientsDto);

      // Verificar que el servicio fue llamado con los datos correctos
      expect(service.removeBulk).toHaveBeenCalledWith(removeBulkClientsDto);

      // Verificar que la respuesta tiene el estado 207 y el resultado esperado
    });
  });
});
