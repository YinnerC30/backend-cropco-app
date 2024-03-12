import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CreateWorkDto } from './dto/create-work.dto';
import type { UpdateWorkDto } from './dto/update-work.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Work } from './entities/work.entity';
import { Repository, UpdateValuesMissingError } from 'typeorm';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';

@Injectable()
export class WorkService {
  private readonly logger = new Logger('WorkService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Work)
    private readonly workRepository: Repository<Work>,
  ) {}

  async create(createWorkDto: CreateWorkDto) {
    const work = this.workRepository.create(createWorkDto);
    await this.workRepository.save(work);
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    return this.workRepository.find({
      order: {
        date: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    const work = await this.workRepository.findOneBy({
      id,
    });
    if (!work)
      throw new NotFoundException(`Work register with id: ${id} not found`);
    return work;
  }

  async update(id: string, updateWorkDto: UpdateWorkDto) {
    await this.findOne(id);
    try {
      await this.workRepository.update(id, updateWorkDto);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.workRepository.remove(user);
  }

  async deleteAllWork() {
    await this.workRepository.clear();
  }
}
