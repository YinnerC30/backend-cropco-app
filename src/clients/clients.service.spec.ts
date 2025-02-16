import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { PrinterService } from 'src/printer/printer.service';
import { Repository } from 'typeorm';
import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { HandlerErrorService } from 'src/common/services/handler-error.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let clientRepository: Repository<Client>;
  let printerService: PrinterService;
  let handlerError: HandlerErrorService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: getRepositoryToken(Client),
          useClass: Repository,
        },
        {
          provide: PrinterService,
          useValue: {
            createPdf: jest.fn(),
          },
        },
        {
          provide: HandlerErrorService,
          useValue: {
            handle: jest.fn(),
            setLogger: jest.fn(), // Añade el método setLogger al mock
          },
        },
        {
          provide: Logger, // Proporciona un mock para Logger
          useValue: {
            error: jest.fn(), // Simula el método error del Logger
          },
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    clientRepository = module.get<Repository<Client>>(
      getRepositoryToken(Client),
    );
    printerService = module.get<PrinterService>(PrinterService);
    handlerError = module.get<HandlerErrorService>(HandlerErrorService);
    logger = module.get<Logger>(Logger); // Obtén el mock del Logger
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new client', async () => {
      const createClientDto: any = {
        first_name: 'John',
        email: 'john@example.com',
      };
      const client = { id: '1', ...createClientDto };
      jest.spyOn(clientRepository, 'create').mockReturnValue(client as any);
      jest.spyOn(clientRepository, 'save').mockResolvedValue(client as any);

      const result = await service.create(createClientDto);
      expect(result).toEqual(client);
    });
  });

  describe('findAll', () => {
    it('should return a list of clients', async () => {
      const clients = [
        { id: '1', first_name: 'John', email: 'john@example.com' },
      ];
      const queryParams = {
        query: '',
        limit: 10,
        offset: 0,
        all_records: false,
      };
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([clients, clients.length]),
      } as any);

      const result = await service.findAll(queryParams);
      expect(result).toEqual({
        total_row_count: clients.length,
        current_row_count: clients.length,
        total_page_count: 1,
        current_page_count: 1,
        records: clients,
      });
    });

    it('should throw NotFoundException if no clients found with pagination', async () => {
      const queryParams = {
        query: '',
        limit: 10,
        offset: 1,
        all_records: false,
      };
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 5]),
      } as any);

      await expect(service.findAll(queryParams)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllClientWithSales', () => {
    it('should return clients with sales', async () => {
      const clients = [
        {
          id: '1',
          first_name: 'John',
          sales_detail: [{ id: '1', total: 100 }],
        },
      ];
      jest.spyOn(clientRepository, 'find').mockResolvedValue(clients as any);

      const result = await service.findAllClientWithSales();
      expect(result).toEqual({
        rowCount: clients.length,
        rows: clients,
      });
    });
  });

  describe('findOne', () => {
    it('should return a client', async () => {
      const client = { id: '1', first_name: 'John', email: 'john@example.com' };
      jest.spyOn(clientRepository, 'findOne').mockResolvedValue(client as any);

      const result = await service.findOne('1');
      expect(result).toEqual(client);
    });

    it('should throw NotFoundException if client not found', async () => {
      jest.spyOn(clientRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a client', async () => {
      const updateClientDto = { first_name: 'John Updated' };
      const client = { id: '1', first_name: 'John', email: 'john@example.com' };
      jest.spyOn(service, 'findOne').mockResolvedValue(client as any);
      jest.spyOn(clientRepository, 'update').mockResolvedValue(undefined);

      await service.update('1', updateClientDto);
      expect(clientRepository.update).toHaveBeenCalledWith(
        '1',
        updateClientDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a client', async () => {
      const client = { id: '1', first_name: 'John', sales_detail: [] };
      jest.spyOn(service, 'findOne').mockResolvedValue(client as any);
      jest.spyOn(clientRepository, 'softRemove').mockResolvedValue(undefined);

      await service.remove('1');
      expect(clientRepository.softRemove).toHaveBeenCalledWith(client);
    });

    it('should throw ConflictException if client has sales receivables', async () => {
      const client = {
        id: '1',
        first_name: 'John',
        sales_detail: [{ is_receivable: true }],
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(client as any);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteAllClients', () => {
    it('should delete all clients', async () => {
      jest.spyOn(clientRepository, 'delete').mockResolvedValue(undefined);

      await service.deleteAllClients();
      expect(clientRepository.delete).toHaveBeenCalledWith({});
    });
  });

  describe('exportAllClients', () => {
    it('should export all clients as PDF', async () => {
      const clients = [
        { id: '1', first_name: 'John', email: 'john@example.com' },
      ];
      const pdfDoc: never | any = {
        info: { Title: '' },
        pipe: jest.fn(),
        end: jest.fn(),
      };
      jest.spyOn(clientRepository, 'find').mockResolvedValue(clients as any);
      jest
        .spyOn(printerService, 'createPdf')
        .mockResolvedValue(pdfDoc as never);

      const result = await service.exportAllClients();
      expect(result).toEqual(pdfDoc);
      console.log(result);
      // expect(result.info.Title).toBe('Listado de clientes');
    });
  });

  describe('removeBulk', () => {
    it('should remove bulk clients', async () => {
      const removeBulkClientsDto = { recordsIds: [{ id: '1' }, { id: '2' }] };
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      await service.removeBulk(removeBulkClientsDto);
      expect(service.remove).toHaveBeenCalledTimes(2);
    });
  });

  describe('findTopClientsInSales', () => {
    it('should return top clients in sales', async () => {
      const clients = [
        {
          id: '1',
          first_name: 'John',
          last_name: 'Doe',
          total_sale: 1000,
          total_quantity: 10,
        },
      ];
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(clients),
      } as any);

      const result = await service.findTopClientsInSales({ year: 2023 });
      expect(result).toEqual({
        rowCount: clients.length,
        rows: clients,
      });
    });
  });
});
