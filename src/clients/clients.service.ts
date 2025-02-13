import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryForYear } from 'src/common/dto/QueryForYear';
import { QueryParams } from 'src/common/dto/QueryParams';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { PrinterService } from 'src/printer/printer.service';
import { ILike, MoreThan, Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { getClientsReport } from './reports/get-all-clients.report';
import { TypeOrmErrorHandlerService } from 'src/common/services/typeorm-error-handler.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly printerService: PrinterService,
    private readonly typeOrmErrorHandler: TypeOrmErrorHandlerService,
  ) {}

  async create(createClientDto: CreateClientDto) {
    try {
      const client = this.clientRepository.create(createClientDto);
      await this.clientRepository.save(client);
      return client;
    } catch (error) {
      this.typeOrmErrorHandler.handle(error);
    }
  }

  async findAll(queryParams: QueryParams) {
    const { query: search = '', limit = 10, offset = 0 } = queryParams;

    const clients = await this.clientRepository.find({
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

    let count: number;
    if (search.length === 0) {
      count = await this.clientRepository.count();
    } else {
      count = clients.length;
    }

    return {
      rowCount: count,
      rows: clients,
      pageCount: Math.ceil(count / limit),
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
      rowCount: clients.length,
      rows: clients,
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
    } catch (error) {
      this.typeOrmErrorHandler.handle(error);
    }
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

  async deleteAllClients() {
    try {
      await this.clientRepository.delete({});
    } catch (error) {
      this.typeOrmErrorHandler.handle(error);
    }
  }

  async exportAllClients() {
    const clients = await this.clientRepository.find();
    const docDefinition = getClientsReport({ clients });
    const pdfDoc = await this.printerService.createPdf(docDefinition);
    pdfDoc.info.Title = 'Listado de clientes';
    return pdfDoc;
  }

  // TODO: Cambiar por transaction
  async removeBulk(removeBulkClientsDto: RemoveBulkRecordsDto<Client>) {
    for (const { id } of removeBulkClientsDto.recordsIds) {
      await this.remove(id);
    }
  }

  async findTopClientsInSales({
    year = new Date().getFullYear(),
  }: QueryForYear) {
    const clients = await this.clientRepository
      .createQueryBuilder('clients')
      .leftJoin('clients.sales_detail', 'sales_detail')
      .leftJoin('sales_detail.sale', 'sale')
      .select([
        'clients.id as id',
        'clients.first_name as first_name',
        'clients.last_name as last_name',
        'CAST(SUM(sales_detail.total) AS INTEGER) AS total_sale',
        'CAST(SUM(sales_detail.quantity) AS INTEGER) AS total_quantity',
      ])
      .where('EXTRACT(YEAR FROM sale.date) = :year', { year })
      .groupBy('clients.id')
      .having('SUM(sales_detail.total) > 0')
      .orderBy('total_sale', 'DESC')
      .limit(5)
      .getRawMany();
    return {
      rowCount: clients.length,
      rows: clients,
    };
  }
}
