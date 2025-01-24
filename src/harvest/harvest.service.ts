import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { HarvestDetails } from './entities/harvest-details.entity';
import { Harvest } from './entities/harvest.entity';

import { organizeIDsToUpdateEntity } from 'src/common/helpers/organizeIDsToUpdateEntity';
import { handleDBExceptions } from '../common/helpers/handleDBErrors';
import { HarvestDetailsDto } from './dto/create-harvest-details.dto';

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { validateTotalInArray } from 'src/common/helpers/validTotalInArray';
import { CreateHarvestProcessedDto } from './dto/create-harvest-processed.dto';
import { QueryParamsHarvest } from './dto/query-params-harvest.dto';
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
    @InjectRepository(HarvestStock)
    private readonly harvestStockRepository: Repository<HarvestStock>,

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

    // TODO: Validar que exista un único empleado por registro de cosecha
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

  async findAll(queryParams: QueryParamsHarvest) {
    const {
      limit = 10,
      offset = 0,

      crop = '',

      filter_by_date = false,
      type_filter_date,
      date,

      filter_by_total = false,
      type_filter_total,
      total,

      filter_by_value_pay = false,
      type_filter_value_pay,
      value_pay,

      employees = [], // Array de IDs de empleados
    } = queryParams;

    let addedFilter =
      !!crop ||
      filter_by_date ||
      filter_by_total ||
      filter_by_value_pay ||
      employees.length > 0;

    const queryBuilder = this.harvestRepository
      .createQueryBuilder('harvest')
      .withDeleted()
      .leftJoinAndSelect('harvest.crop', 'crop')
      .leftJoinAndSelect('harvest.details', 'details')
      .leftJoinAndSelect('details.employee', 'employee')
      .orderBy('harvest.date', 'DESC')
      .take(limit)
      .skip(offset * limit);

    if (crop.length > 0) {
      queryBuilder.andWhere('harvest.crop = :cropId', { cropId: crop });
    }

    if (filter_by_date) {
      const operation =
        TypeFilterDate.AFTER == type_filter_date
          ? '>'
          : TypeFilterDate.EQUAL == type_filter_date
            ? '='
            : '<';
      queryBuilder.andWhere(`harvest.date ${operation} :date`, { date });
    }

    if (filter_by_total) {
      const operation =
        TypeFilterNumber.MAX == type_filter_total
          ? '>'
          : TypeFilterNumber.EQUAL == type_filter_total
            ? '='
            : '<';
      queryBuilder.andWhere(`harvest.total ${operation} :total`, { total });
    }

    if (filter_by_value_pay) {
      const operation =
        TypeFilterNumber.MAX == type_filter_value_pay
          ? '>'
          : TypeFilterNumber.EQUAL == type_filter_value_pay
            ? '='
            : '<';
      queryBuilder.andWhere(`harvest.value_pay ${operation} :value_pay`, {
        value_pay,
      });
    }

    if (employees.length > 0) {
      queryBuilder.andWhere('details.employee IN (:...employees)', {
        employees,
      });
    }

    const result = await queryBuilder.getMany();

    const count = addedFilter
      ? result.length
      : await this.harvestRepository.count();

    return {
      rowCount: count,
      rows: result,
      pageCount: Math.ceil(count / limit),
    };
  }

  async findOne(id: string) {
    const harvest = await this.harvestRepository.findOne({
      withDeleted: true,
      where: {
        id,
      },
      relations: {
        details: { employee: true, payments_harvest: true },
        crop: true,
        processed: {
          crop: true,
        },
      },
    });

    if (!harvest)
      throw new NotFoundException(`Harvest with id: ${id} not found`);

    const total_processed = harvest.processed.reduce(
      (accumulator, currentValue) => accumulator + currentValue.total,
      0,
    );
    return { ...harvest, total_processed };
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
      const newIDs = newHarvestDetails.map((record) =>
        new String(record.id).toString(),
      );
      const oldHarvestDetails = harvest.details;
      const oldIDs = oldHarvestDetails.map((record) =>
        new String(record.id).toString(),
      );

      const { toCreate, toDelete, toUpdate } = organizeIDsToUpdateEntity(
        newIDs,
        oldIDs,
      );

      for (const recordId of toDelete) {
        const dataRecordOld = oldHarvestDetails.find(
          (record) => record.id === recordId,
        );

        if (
          dataRecordOld.deletedDate !== null ||
          dataRecordOld.payment_is_pending === false
        ) {
          throw new BadRequestException(
            'You cannot delete this record, it is linked to other records.',
          );
        } else {
          await queryRunner.manager.delete(HarvestDetails, {
            id: recordId,
          });
        }
      }

      for (const recordId of toUpdate) {
        const dataRecordNew = newHarvestDetails.find(
          (record) => record.id === recordId,
        );
        const dataRecordOld = oldHarvestDetails.find(
          (record) => record.id === recordId,
        );

        const valuesAreDiferent =
          dataRecordNew.total !== dataRecordOld.total ||
          dataRecordNew.value_pay !== dataRecordOld.value_pay;

        if (
          (dataRecordOld.deletedDate !== null ||
            dataRecordOld.payment_is_pending === false) &&
          valuesAreDiferent
        ) {
          throw new BadRequestException(
            'You cannot update this record, it is linked to other records.',
          );
        }

        await queryRunner.manager.update(
          HarvestDetails,
          {
            id: recordId,
          },
          dataRecordNew,
        );
      }

      for (const recordId of toCreate) {
        const dataRecord = newHarvestDetails.find(
          (record) => record.id === recordId,
        );

        const recordToCreate = queryRunner.manager.create(HarvestDetails, {
          harvest: id,
          ...dataRecord,
        });

        await queryRunner.manager.save(recordToCreate);
      }

      const { details, crop, ...rest } = updateHarvestDto;
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

    if (harvest.processed.length > 0) {
      throw new ConflictException(
        'The record cannot be deleted because it has processed records linked to it.',
      );
    }

    if (harvest.details.some((item) => item.payments_harvest !== null)) {
      throw new ConflictException(
        'The record cannot be deleted because it has payments linked to it.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const harvestProcessed of harvest.processed) {
        await queryRunner.manager.remove(harvestProcessed);
        const { crop } = harvestProcessed;
        await this.updateStock(
          queryRunner,
          crop.id,
          harvestProcessed.total,
          false,
        );
      }

      await queryRunner.manager.remove(Harvest, harvest);

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

  async findAllHarvestStock() {
    const harvestStock = await this.harvestStockRepository.find({
      relations: {
        crop: true,
      },
    });
    let count: number = harvestStock.length;

    return {
      rowCount: count,
      rows: harvestStock.map((item) => ({
        id: item.crop.id,
        name: item.crop.name,
        stock: item.total,
      })),
      pageCount: count > 0 ? 1 : 0,
    };
  }

  async updateStock(
    queryRunner: QueryRunner,
    cropId: any, //TODO: Remover tipo any aquí y en otros métodos
    total: number,
    increment = true,
  ) {
    const recordHarvestCropStock = await queryRunner.manager
      .getRepository(HarvestStock)
      .findOne({
        relations: { crop: true },
        where: { crop: { id: cropId } },
      });

    if (!recordHarvestCropStock) {
      const recordToSave = queryRunner.manager.create(HarvestStock, {
        crop: cropId,
        total: 0,
      });
      await queryRunner.manager.save(HarvestStock, recordToSave);
    }
    if (increment) {
      await queryRunner.manager.increment(
        HarvestStock,
        { crop: cropId },
        'total',
        total,
      );
      return;
    }
    const amountActually = recordHarvestCropStock?.total ?? 0;
    if (amountActually < total) {
      throw new InsufficientHarvestStockException(
        amountActually,
        recordHarvestCropStock.crop.name,
      );
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
    actualAmount: number,
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

    if (totalProcessed - actualAmount + dto.total > harvest.total) {
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

    await this.validateTotalProcessed(
      queryRunner,
      createHarvestProcessedDto,
      0,
    );

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

  async findAllHarvestProcessed() {
    const harvestProcessed = await this.harvestProcessedRepository.find({
      withDeleted: true,
      order: {
        date: 'ASC',
      },
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
      pageCount: count > 0 ? 1 : 0,
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

    await this.validateTotalProcessed(
      queryRunner,
      updateHarvestProcessedDto,
      harvestProcessed.total,
    );

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

  async removeBulk(removeBulkHarvestsDto: RemoveBulkRecordsDto<Harvest>) {
    for (const { id } of removeBulkHarvestsDto.recordsIds) {
      await this.remove(id);
    }
  }
}
