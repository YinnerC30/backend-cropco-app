import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, QueryRunner, Repository } from 'typeorm';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { HarvestDetails } from './entities/harvest-details.entity';
import { Harvest } from './entities/harvest.entity';

import { QueryParams } from 'src/common/dto/QueryParams';

import { organizeIDsToUpdateEntity } from 'src/common/helpers/organizeIDsToUpdateEntity';
import { handleDBExceptions } from '../common/helpers/handleDBErrors';
import { HarvestDetailsDto } from './dto/create-harvest-details.dto';

import { validateTotalInArray } from 'src/common/helpers/validTotalInArray';
import { CreateHarvestProcessedDto } from './dto/create-harvest-processed.dto';
import { UpdateHarvestProcessedDto } from './dto/update-harvest-processed.dto';
import { HarvestProcessed } from './entities/harvest-processed.entity';
import { HarvestStock } from './entities/harvest-stock.entity';
import { InsufficientHarvestStockException } from './exceptions/insufficient-harvest-stock';

@Injectable()
export class HarvestService {
  private readonly logger = new Logger('HarvestsService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Harvest)
    private readonly harvestRepository: Repository<Harvest>,

    @InjectRepository(HarvestProcessed)
    private readonly harvestProcessedRepository: Repository<HarvestProcessed>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createHarvestDto: CreateHarvestDto) {
    validateTotalInArray(createHarvestDto, {
      propertyNameArray: 'details',
      namesPropertiesToSum: ['total', 'value_pay'],
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { details, ...rest } = createHarvestDto;

      const harvest = queryRunner.manager.create(Harvest, { ...rest });
      harvest.details = details.map((harvestDetailsDto: HarvestDetailsDto) =>
        queryRunner.manager.create(HarvestDetails, harvestDetailsDto),
      );
      await queryRunner.manager.save(harvest);
      await queryRunner.commitTransaction();
      return harvest;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(queryParams: QueryParams) {
    const { limit = 10, offset = 0 } = queryParams;
    const harvests = await this.harvestRepository
      .createQueryBuilder('harvest')
      .leftJoinAndSelect('harvest.crop', 'crop')
      .select([
        'harvest.id',
        'harvest.date',
        'harvest.total',
        'harvest.value_pay',
        'harvest.observation',
        'crop.name',
      ])
      .orderBy('harvest.date', 'ASC')
      .take(limit)
      .skip(offset * limit)
      .getMany();
    let count: number = harvests.length;

    return {
      rowCount: count,
      rows: harvests.map((item) => ({ ...item, crop: item.crop.name })),
      pageCount: Math.ceil(count / limit),
    };
  }

  async findOne(id: string) {
    const harvest = await this.harvestRepository.findOne({
      where: {
        id,
      },
      relations: {
        details: { employee: true, payments_harvest: true },
        crop: true,
        processed: true,
      },
    });
    if (!harvest)
      throw new NotFoundException(`Harvest with id: ${id} not found`);
    return harvest;
  }

  async update(id: string, updateHarvestDto: UpdateHarvestDto) {
    validateTotalInArray(updateHarvestDto, {
      propertyNameArray: 'details',
      namesPropertiesToSum: ['total', 'value_pay'],
    });

    const harvest = await this.findOne(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const newHarvestDetails = updateHarvestDto.details;
      const newIDsEmployees = newHarvestDetails.map((record) =>
        new String(record.employee.id).toString(),
      );
      const oldHarvestDetails = harvest.details;
      const oldIDsEmployees = oldHarvestDetails.map((record) =>
        new String(record.employee.id).toString(),
      );

      console.log({
        newHarvestDetails,
        newIDsEmployees,
        oldHarvestDetails,
        oldIDsEmployees,
      });

      const { toCreate, toDelete, toUpdate } = organizeIDsToUpdateEntity(
        newIDsEmployees,
        oldIDsEmployees,
      );

      console.log({
        toCreate,
        toDelete,
        toUpdate,
      });

      for (const employeeId of toDelete) {
        await queryRunner.manager.delete(HarvestDetails, {
          harvest: id,
          employee: employeeId,
        });
      }

      for (const employeeId of toUpdate) {
        const dataRecord = newHarvestDetails.find(
          (record) => record.employee.id === employeeId,
        );
        await queryRunner.manager.update(
          HarvestDetails,
          { harvest: id, employee: employeeId },
          dataRecord,
        );
      }

      for (const employeeId of toCreate) {
        const dataRecord = newHarvestDetails.find(
          (record) => record.employee.id === employeeId,
        );

        const recordToCreate = queryRunner.manager.create(HarvestDetails, {
          harvest: id,
          ...dataRecord,
        });

        await queryRunner.manager.save(recordToCreate);
      }

      const { details, ...rest } = updateHarvestDto;
      await queryRunner.manager.update(Harvest, { id }, rest);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string) {
    const harvest: Harvest = await this.findOne(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.remove(harvest);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAllHarvest() {
    try {
      await this.harvestRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async updateStock(
    queryRunner: QueryRunner,
    cropId: any, //TODO: Remover tipo any aquí y en otros métodos
    total: number,
    increment = true,
  ) {
    const recordHarvestCropStock = await queryRunner.manager
      .getRepository(HarvestStock)
      .createQueryBuilder('harvestStock')
      .where('harvestStock.cropId = :cropId', { cropId })
      .getOne();

    if (!recordHarvestCropStock) {
      const recordToSave = queryRunner.manager.create(HarvestStock, {
        crop: cropId,
        total: 0,
      });
      await queryRunner.manager.save(HarvestStock, recordToSave);
    }
    if (increment) {
      return await queryRunner.manager.increment(
        HarvestStock,
        { crop: cropId },
        'total',
        total,
      );
    }
    const amountActually = recordHarvestCropStock?.total ?? 0; 
    if (amountActually < total) {
      throw new InsufficientHarvestStockException();
    }
    await queryRunner.manager.decrement(
      HarvestStock,
      { crop: cropId },
      'total',
      total,
    );
  }

  async validateTotalProcessed(
    queryRunner: QueryRunner,
    dto: CreateHarvestDto | UpdateHarvestDto | any,
  ) {
    const harvest = await queryRunner.manager
      .createQueryBuilder(Harvest, 'harvest')
      .leftJoinAndSelect('harvest.processed', 'processed')
      .where('harvest.id = :id', { id: dto.harvest.id })
      .getOne();

    if (!harvest) {
      throw new NotFoundException('Cosecha no encontrada');
    }

    const totalProcessed = harvest.processed.reduce(
      (acc, record) => acc + record.total,
      0,
    );

    if (totalProcessed + dto.total > harvest.total) {
      throw new BadRequestException(
        'No puedes agregar más registros de cosecha procesada, supera el valor de la cosecha',
      );
    }

    return;
  }

  async createHarvestProcessed(
    createHarvestProcessedDto: CreateHarvestProcessedDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();

    await this.validateTotalProcessed(queryRunner, createHarvestProcessedDto);

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const harvestProcessed = queryRunner.manager.create(
        HarvestProcessed,
        createHarvestProcessedDto,
      );
      await queryRunner.manager.save(HarvestProcessed, harvestProcessed);
      const { crop, total } = createHarvestProcessedDto;
      await this.updateStock(queryRunner, crop.id, total, true);

      await queryRunner.commitTransaction();
      await queryRunner.release();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAllHarvestProcessed(queryParams: QueryParams) {
    const { limit = 10, offset = 0 } = queryParams;
    const harvestProcessed = await this.harvestProcessedRepository.find({
      order: {
        date: 'ASC',
      },
      take: limit,
      skip: offset,
      relations: {
        crop: true,
        harvest: true,
      },
    });
    let count: number = harvestProcessed.length;

    return {
      rowCount: count,
      rows: harvestProcessed.map((item) => ({
        ...item,
        crop: item.crop.name,
        harvest: item.harvest.date,
      })),
      pageCount: Math.ceil(count / limit),
    };
  }

  async findOneHarvestProcessed(id: string) {
    const harvestProcessed = await this.harvestProcessedRepository.findOne({
      where: {
        id,
      },
      relations: {
        crop: true,
        harvest: true,
      },
    });
    if (!harvestProcessed)
      throw new NotFoundException(`Harvest processed with id: ${id} not found`);
    return harvestProcessed;
  }

  async updateHarvestProcessed(
    id: string,
    updateHarvestProcessedDto: UpdateHarvestProcessedDto,
  ) {
    const harvestProcessed = await this.findOneHarvestProcessed(id);

    const queryRunner = this.dataSource.createQueryRunner();

    await this.validateTotalProcessed(queryRunner, updateHarvestProcessedDto);

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.updateStock(
        queryRunner,
        harvestProcessed.crop.id,
        harvestProcessed.total,
        false,
      );

      await queryRunner.manager.update(
        HarvestProcessed,
        { id },
        updateHarvestProcessedDto,
      );

      const { crop, total } = updateHarvestProcessedDto;

      await this.updateStock(queryRunner, crop.id, total, true);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async removeHarvestProcessed(id: string) {
    const harvestProcessed: HarvestProcessed =
      await this.findOneHarvestProcessed(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete Harvest
      await queryRunner.manager.remove(harvestProcessed);

      const { crop } = harvestProcessed;

      await this.updateStock(
        queryRunner,
        crop.id,
        harvestProcessed.total,
        false,
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }
}
