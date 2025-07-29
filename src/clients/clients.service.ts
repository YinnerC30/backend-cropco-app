import { QueryForYearDto } from '@common/dto/query-for-year.dto';
import { QueryParamsDto } from '@common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from '@common/dto/remove-bulk-records.dto';
import { BulkRemovalHelper } from '@common/helpers/bulk-removal.helper';
import { TemplateGetAllRecords } from '@common/interfaces/TemplateGetAllRecords';
import { BaseTenantService } from '@common/services/base-tenant.service';
import { HandlerErrorService } from '@common/services/handler-error.service';
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrinterService } from '@printer/printer.service';
import { Request } from 'express';
import { MoreThan, Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { getClientsReport } from './reports/get-all-clients.report';

@Injectable()
export class ClientsService extends BaseTenantService {
  protected readonly logger = new Logger('ClientsService');
  private clientRepository: Repository<Client>;

  constructor(
    @Inject(REQUEST) request: Request,
    private readonly printerService: PrinterService,
    private readonly handlerError: HandlerErrorService,
  ) {
    super(request);
    this.setLogger(this.logger);
    this.clientRepository = this.getTenantRepository(Client);
  }

  async create(createClientDto: CreateClientDto) {
    this.logWithContext(
      `Creating new client with email: ${createClientDto.email}`,
    );

    try {
      const client = this.clientRepository.create(createClientDto);
      const savedClient = await this.clientRepository.save(client);

      this.logWithContext(
        `Client created successfully with ID: ${savedClient.id}`,
      );
      return savedClient;
    } catch (error) {
      this.logWithContext(
        `Failed to create client with email: ${createClientDto.email}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAll(
    queryParams: QueryParamsDto,
  ): Promise<TemplateGetAllRecords<Client>> {
    this.logWithContext(
      `Finding all clients with query: "${queryParams.query || 'no query'}", limit: ${queryParams.limit || 10}, offset: ${queryParams.offset || 0}, all_records: ${queryParams.all_records || false}`,
    );

    try {
      const {
        query = '',
        limit = 10,
        offset = 0,
        all_records = false,
      } = queryParams;

      const queryBuilder = this.clientRepository.createQueryBuilder('clients');

      !!query &&
        !all_records &&
        queryBuilder
          .where('clients.first_name ILIKE :query', { query: `${query}%` })
          .orWhere('clients.last_name ILIKE :query', { query: `${query}%` })
          .orWhere('clients.email ILIKE :query', { query: `${query}%` });

      !all_records && queryBuilder.take(limit).skip(offset * limit);

      const [clients, count] = await queryBuilder.getManyAndCount();

      this.logWithContext(
        `Found ${clients.length} clients out of ${count} total clients`,
      );

      if (clients.length === 0 && count > 0) {
        throw new NotFoundException(
          'There are no client records with the requested pagination',
        );
      }

      return {
        total_row_count: count,
        current_row_count: clients.length,
        total_page_count: all_records ? 1 : Math.ceil(count / limit),
        current_page_count: all_records ? 1 : offset + 1,
        records: clients,
      };
    } catch (error) {
      this.logWithContext(
        `Failed to find clients with query: "${queryParams.query || 'no query'}"`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllClientWithSales() {
    this.logWithContext('Finding all clients with sales');

    try {
      const clients = await this.clientRepository.find({
        withDeleted: true,
        where: {
          sales_detail: MoreThan(0),
        },
        relations: {
          sales_detail: true,
        },
      });

      this.logWithContext(`Found ${clients.length} clients with sales`);

      return {
        total_row_count: clients.length,
        records: clients,
      };
    } catch (error) {
      this.logWithContext('Failed to find clients with sales', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOne(id: string) {
    this.logWithContext(`Finding client by ID: ${id}`);

    try {
      const client = await this.clientRepository.findOne({
        where: { id },
        relations: { sales_detail: { crop: true, sale: true } },
        order: {
          sales_detail: {
            sale: { date: 'DESC' },
          },
        },
      });

      if (!client) {
        this.logWithContext(`Client with ID: ${id} not found`, 'warn');
        throw new NotFoundException(`Client with id: ${id} not found`);
      }

      this.logWithContext(`Client found successfully with ID: ${id}`);
      return client;
    } catch (error) {
      this.logWithContext(`Failed to find client with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    this.logWithContext(`Updating client with ID: ${id}`);

    try {
      await this.findOne(id);
      await this.clientRepository.update(id, updateClientDto);
      const updatedClient = await this.findOne(id);

      this.logWithContext(`Client updated successfully with ID: ${id}`);
      return updatedClient;
    } catch (error) {
      this.logWithContext(`Failed to update client with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async deleteAllClients() {
    this.logWithContext(
      'Deleting ALL clients - this is a destructive operation',
      'warn',
    );

    try {
      await this.clientRepository.query(
        'TRUNCATE TABLE clients RESTART IDENTITY CASCADE',
      );
      this.logWithContext('All clients deleted successfully');
    } catch (error) {
      this.logWithContext('Failed to delete all clients', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async exportAllClients() {
    this.logWithContext('Exporting all clients to PDF');

    try {
      const clients = await this.clientRepository.find();

      if (clients.length === 0) {
        this.logWithContext('No clients found for export', 'warn');
        throw new NotFoundException('No clients found');
      }

      const docDefinition = getClientsReport({ clients });
      const pdfDoc = this.printerService.createPdf({
        title: 'Listado de clientes',
        docDefinition,
      });

      this.logWithContext(
        `Clients exported successfully, total exported: ${clients.length}`,
      );
      return pdfDoc;
    } catch (error) {
      this.logWithContext('Failed to export clients', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    this.logWithContext(`Attempting to remove client with ID: ${id}`);

    try {
      const client = await this.findOne(id);

      if (client.sales_detail.some((record) => record.is_receivable === true)) {
        this.logWithContext(
          `Cannot remove client with ID: ${id} - has sales receivables`,
          'warn',
        );
        throw new ConflictException(
          `The client ${client.first_name} ${client.last_name} has sales receivables`,
        );
      }

      await this.clientRepository.softRemove(client);
      this.logWithContext(`Client with ID: ${id} removed successfully`);
    } catch (error) {
      this.logWithContext(`Failed to remove client with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulk(removeBulkClientsDto: RemoveBulkRecordsDto<Client>) {
    try {
      return await BulkRemovalHelper.executeBulkRemoval(
        removeBulkClientsDto.recordsIds,
        (id: string) => this.remove(id),
        this.logger,
        { entityName: 'clients' },
      );
    } catch (error) {
      this.logWithContext(`Failed to execute bulk removal of clients`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findTopClientsInSales({
    year = new Date().getFullYear(),
  }: QueryForYearDto) {
    this.logWithContext(`Finding top clients in sales for year: ${year}`);

    try {
      const clients = await this.clientRepository.query(
        `
        SELECT sd."clientId" AS id,
         cl.first_name,
         cl.last_name,
         CAST(SUM(convert_to_grams(sd.unit_of_measure::TEXT, sd.amount::NUMERIC)) AS INTEGER) AS total_amount,
         CAST(SUM(sd.value_pay) AS INTEGER)                                  AS total_value_pay
         FROM sales_detail sd JOIN sales s ON sd."saleId" = s.id
                              JOIN clients cl ON sd."clientId" = cl.id
         WHERE EXTRACT(
                       YEAR
                       FROM
                       s.date
               ) = $1
         GROUP BY sd."clientId",
                  cl.first_name,
                  cl.last_name
         ORDER BY total_amount DESC
         LIMIT 5
        `,
        [year],
      );

      const count = clients.length;

      this.logWithContext(
        `Found ${count} top clients in sales for year: ${year}`,
      );

      return {
        total_row_count: count,
        current_row_count: count,
        total_page_count: count > 0 ? 1 : 0,
        current_page_count: count > 0 ? 1 : 0,
        records: clients,
      };
    } catch (error) {
      this.logWithContext(
        `Failed to find top clients in sales for year: ${year}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }
}
