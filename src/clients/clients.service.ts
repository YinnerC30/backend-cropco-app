import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Search } from 'src/common/dto/search.dto';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { Like, Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger('ClientsService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto) {
    try {
      const client = this.clientRepository.create(createClientDto);
      await this.clientRepository.save(client);
      return client;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(search: Search) {
    const { parameter = '', limit = 10, offset = 0 } = search;

    const clients = await this.clientRepository.find({
      where: [
        {
          first_name: Like(`${parameter}%`),
        },
        {
          email: Like(`${parameter}%`),
        },
      ],
      order: {
        first_name: 'ASC',
      },
      take: limit,
      skip: offset * limit,
    });

    let count: number;
    if (parameter.length === 0) {
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

  async findOne(id: string) {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: { sales_detail: { crop: true, sale: true } },
    });
    if (!client) throw new NotFoundException(`Client with id: ${id} not found`);
    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    await this.findOne(id);
    try {
      await this.clientRepository.update(id, updateClientDto);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const client = await this.findOne(id);
    await this.clientRepository.remove(client);
  }

  async deleteAllClients() {
    try {
      await this.clientRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
