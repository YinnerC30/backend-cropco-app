import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryForYearDto } from 'src/common/dto/query-for-year.dto';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { PrinterService } from 'src/printer/printer.service';
import { MoreThan, Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { getClientsReport } from './reports/get-all-clients.report';
import { TemplateGetAllRecords } from 'src/common/interfaces/TemplateGetAllRecords';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger('ClientsService'); // Logger personalizado

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly printerService: PrinterService,
    private readonly handlerError: HandlerErrorService, // Inyecta HandlerErrorService
  ) {
    // Proporciona el Logger personalizado a HandlerErrorService
  }
  async create(createClientDto: CreateClientDto) {
    try {
      const client = this.clientRepository.create(createClientDto);
      await this.clientRepository.save(client);
      return client;
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAll(
    queryParams: QueryParamsDto,
  ): Promise<TemplateGetAllRecords<Client>> {
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
        .orWhere('clients.email ILIKE :query', { query: `${query}%` });

    !all_records && queryBuilder.take(limit).skip(offset * limit);

    const [clients, count] = await queryBuilder.getManyAndCount();

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
  }

  async findAllClientWithSales() {
    const clients = await this.clientRepository.find({
      where: {
        sales_detail: MoreThan(0),
      },
      relations: {
        sales_detail: true,
      },
    });

    return {
      total_row_count: clients.length,
      records: clients,
    };
  }

  async findOne(id: string) {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: { sales_detail: { crop: true } },
    });
    if (!client) throw new NotFoundException(`Client with id: ${id} not found`);
    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    await this.findOne(id);
    try {
      await this.clientRepository.update(id, updateClientDto);
      return await this.findOne(id);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async deleteAllClients() {
    // INFO: Solo ejecutar en entorno de desarrollo
    try {
      await this.clientRepository.delete({});
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async exportAllClients() {
    const clients = await this.clientRepository.find();

    if (clients.length === 0) {
      throw new NotFoundException('No clients found');
    }

    const docDefinition = getClientsReport({ clients });
    const pdfDoc = this.printerService.createPdf({
      title: 'Listado de clientes',
      docDefinition,
    });
    return pdfDoc;
  }

  async remove(id: string) {
    const client = await this.findOne(id);

    if (client.sales_detail.some((record) => record.is_receivable === true)) {
      throw new ConflictException(
        `The client ${client.first_name} ${client.last_name} has sales receivables`,
      );
    }

    await this.clientRepository.softRemove(client);
  }

  async removeBulk(removeBulkClientsDto: RemoveBulkRecordsDto<Client>) {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const { id } of removeBulkClientsDto.recordsIds) {
      try {
        await this.remove(id);
        success.push(id);
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }

    return { success, failed };
  }

  async findTopClientsInSales({
    year = new Date().getFullYear(),
  }: QueryForYearDto) {
    const clients = await this.clientRepository
      .createQueryBuilder('clients')
      .leftJoin('clients.sales_detail', 'sales_detail')
      .leftJoin('sales_detail.sale', 'sale')
      .select([
        'clients.id as id',
        'clients.first_name as first_name',
        'clients.last_name as last_name',
        'CAST(SUM(sales_detail.value_pay) AS INTEGER) AS total_value_pay',
        'CAST(SUM(sales_detail.amount) AS INTEGER) AS total_amount',
      ])
      .where('EXTRACT(YEAR FROM sale.date) = :year', { year })
      .groupBy('clients.id')
      .having('SUM(sales_detail.value_pay) > 0')
      .orderBy('total_value_pay', 'DESC')
      .limit(5)
      .getRawMany();

    const count = clients.length;

    return {
      total_row_count: count,
      current_row_count: count,
      total_page_count: count > 0 ? 1 : 0,
      current_page_count: count > 0 ? 1 : 0,
      records: clients,
    };
  }
}
