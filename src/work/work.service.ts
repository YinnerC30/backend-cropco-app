import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryParams } from 'src/common/dto/QueryParams';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { DataSource, Repository } from 'typeorm';
import { CreateWorkDto } from './dto/create-work.dto';
import type { UpdateWorkDto } from './dto/update-work.dto';
import { Work } from './entities/work.entity';
import { WorkDetailsDto } from './dto/work-details.dto';
import { WorkDetails } from './entities/work-details.entity';
import { organizeIDsToUpdateEntity } from 'src/common/helpers/organizeIDsToUpdateEntity';

@Injectable()
export class WorkService {
  private readonly logger = new Logger('WorkService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Work)
    private readonly workRepository: Repository<Work>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createWorkDto: CreateWorkDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { details, ...rest } = createWorkDto;

      const work = queryRunner.manager.create(Work, rest);

      work.details = details.map((workDetails: WorkDetailsDto) => {
        return queryRunner.manager.create(WorkDetails, workDetails);
      });

      await queryRunner.manager.save(work);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(queryParams: QueryParams) {
    const { limit = 10, offset = 0 } = queryParams;
    const works = await this.workRepository.find({
      order: {
        date: 'ASC',
      },
      relations: {
        crop: true,
      },
      take: limit,
      skip: offset,
    });

    let count: number = works.length;

    return {
      rowCount: count,
      rows: works,
      pageCount: Math.ceil(count / limit),
    };
  }

  async findOne(id: string) {
    const work: any = await this.workRepository.find({
      where: { id },
      relations: { crop: true, details: { employee: true } },
    });
    if (!work)
      throw new NotFoundException(`Work register with id: ${id} not found`);
    return work;
  }

  async update(id: string, updateWorkDto: UpdateWorkDto) {
    const [work] = await this.findOne(id);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { details, ...rest } = updateWorkDto;

      const oldDetails: WorkDetails[] = work.details;
      const newDetails: WorkDetailsDto[] = details;

      const oldIDs: string[] = oldDetails.map((record) => record.id);
      const newIDs: string[] = newDetails.map((record) =>
        new String(record.id).toString(),
      );

      const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
        newIDs,
        oldIDs,
      );

      for (const recordId of toDelete) {
        await queryRunner.manager.delete(WorkDetails, recordId);
      }

      for (const recordId of toUpdate) {
        const work = newDetails.find((item) => {
          return item.id === recordId;
        });
        const { id, ...rest } = work;
        await queryRunner.manager.update(WorkDetails, id, rest);
      }

      for (const recordId of toCreate) {
        const { id: idWorkDetail, ...rest } = newDetails.find((item) => {
          return item.id === recordId;
        });
        const recordToCreate = queryRunner.manager.create(WorkDetails, {
          ...rest,
          work: { id },
        });
        await queryRunner.manager.save(WorkDetails, recordToCreate);
      }

      await queryRunner.manager.update(Work, id, rest);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string) {
    const work = await this.findOne(id);
    await this.workRepository.remove(work);
  }

  async deleteAllWork() {
    try {
      await this.workRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
