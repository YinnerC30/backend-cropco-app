import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { HarvestDto } from './dto/harvest.dto';

import { HarvestDetails } from './entities/harvest-details.entity';
import { Harvest } from './entities/harvest.entity';

import { organizeIDsToUpdateEntity } from 'src/common/helpers/organize-ids-to-update-entity';
import { HarvestDetailsDto } from './dto/harvest-details.dto';

import { UUID } from 'node:crypto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TemplateGetAllRecords } from 'src/common/interfaces/TemplateGetAllRecords';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { monthNamesES } from 'src/common/utils/monthNamesEs';
import { PrinterService } from 'src/printer/printer.service';

import { QueryParamsHarvest } from './dto/query-params-harvest.dto';

import { HarvestProcessed } from './entities/harvest-processed.entity';
import { HarvestStock } from './entities/harvest-stock.entity';
import { InsufficientHarvestStockException } from './exceptions/insufficient-harvest-stock';
import { calculateGrowthHarvest } from './helpers/calculateGrowthHarvest';
import { getHarvestReport } from './reports/get-harvest';
import { getComparisonOperator } from 'src/common/helpers/get-comparison-operator';
import { HarvestProcessedDto } from './dto/harvest-processed.dto';
import { QueryParamsTotalHarvestsInYearDto } from './dto/query-params-total-harvests-year';
import { Crop } from 'src/crops/entities/crop.entity';

@Injectable()
export class HarvestService {
  private readonly logger = new Logger('HarvestsService');

  constructor(
    @InjectRepository(Harvest)
    private readonly harvestRepository: Repository<Harvest>,

    @InjectRepository(HarvestProcessed)
    private readonly harvestProcessedRepository: Repository<HarvestProcessed>,

    private readonly dataSource: DataSource,
    private readonly printerService: PrinterService,
    private handlerError: HandlerErrorService,
  ) {}

  async create(createHarvestDto: HarvestDto) {
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
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    queryParams: QueryParamsHarvest,
  ): Promise<TemplateGetAllRecords<Harvest>> {
    const {
      limit = 10,
      offset = 0,

      crop = '',

      filter_by_date = false,
      type_filter_date,
      date,

      filter_by_amount = false,
      type_filter_amount,
      amount,

      filter_by_value_pay = false,
      type_filter_value_pay,
      value_pay,

      employees = [],
    } = queryParams;

    const queryBuilder = this.harvestRepository
      .createQueryBuilder('harvest')
      .withDeleted()
      .leftJoinAndSelect('harvest.crop', 'crop')
      .leftJoinAndSelect('harvest.details', 'details')
      .leftJoinAndSelect('details.employee', 'employee')
      .orderBy('harvest.date', 'DESC')
      .take(limit)
      .skip(offset * limit);

    crop.length > 0 &&
      queryBuilder.andWhere('harvest.crop = :cropId', { cropId: crop });

    filter_by_date &&
      queryBuilder.andWhere(
        `harvest.date ${getComparisonOperator(type_filter_date)} :date`,
        { date },
      );

    filter_by_amount &&
      queryBuilder.andWhere(
        `harvest.amount ${getComparisonOperator(type_filter_amount)} :amount`,
        { amount },
      );

    filter_by_value_pay &&
      queryBuilder.andWhere(
        `harvest.value_pay ${getComparisonOperator(type_filter_value_pay)} :value_pay`,
        {
          value_pay,
        },
      );

    employees.length > 0 &&
      queryBuilder.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('harvest.id')
          .from('harvests', 'harvest')
          .leftJoin('harvest.details', 'details')
          .leftJoin('details.employee', 'employee')
          .where('employee.id IN (:...employees)', { employees })
          .getQuery();
        return 'harvest.id IN ' + subQuery;
      });

    const [harvest, count] = await queryBuilder.getManyAndCount();

    if (harvest.length === 0 && count > 0) {
      throw new NotFoundException(
        'There are no harvest records with the requested pagination',
      );
    }

    return {
      total_row_count: count,
      current_row_count: harvest.length,
      total_page_count: Math.ceil(count / limit),
      current_page_count: harvest.length > 0 ? offset + 1 : 0,
      records: harvest,
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
      (accumulator, currentValue) => accumulator + currentValue.amount,
      0,
    );
    return { ...harvest, total_processed };
  }

  async update(id: string, updateHarvestDto: HarvestDto) {
    const harvest = await this.findOne(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const newHarvestDetails = updateHarvestDto.details ?? [];
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

        if (dataRecordOld.payment_is_pending === false) {
          throw new BadRequestException(
            `You cannot delete the record with id ${recordId} , it is linked to a payment record.`,
          );
        }

        if (dataRecordOld.deletedDate !== null) {
          throw new BadRequestException(
            `You cannot delete the record with id ${recordId} , it is linked to other records.`,
          );
        }

        await queryRunner.manager.delete(HarvestDetails, {
          id: recordId,
        });
      }

      for (const recordId of toUpdate) {
        const dataRecordNew = newHarvestDetails.find(
          (record) => record.id === recordId,
        );
        const dataRecordOld = oldHarvestDetails.find(
          (record) => record.id === recordId,
        );

        const valuesAreDifferent =
          dataRecordNew.amount !== dataRecordOld.amount ||
          dataRecordNew.value_pay !== dataRecordOld.value_pay;

        if (valuesAreDifferent) {
          switch (true) {
            case dataRecordOld.payment_is_pending === false:
              throw new BadRequestException(
                `You cannot update the record with id ${recordId} , it is linked to a payment record.`,
              );
            case dataRecordOld.deletedDate !== null:
              throw new BadRequestException(
                `You cannot update the record with id ${recordId} , it is linked to other records.`,
              );
          }
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
        } as HarvestDetailsDto);

        await queryRunner.manager.save(recordToCreate);
      }

      const { details, crop, ...rest } = updateHarvestDto;
      await queryRunner.manager.update(Harvest, { id }, rest);

      await queryRunner.commitTransaction();
      return await this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string) {
    const harvest: Harvest = await this.findOne(id);

    if (harvest.processed.length > 0) {
      throw new ConflictException(
        `The record with id ${harvest.id} cannot be deleted because it has processed records linked to it.`,
      );
    }

    if (harvest.details.some((item) => item.payments_harvest !== null)) {
      throw new ConflictException(
        `The record with id ${harvest.id} cannot be deleted because it has payments linked to it.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.remove(Harvest, harvest);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAllHarvest() {
    try {
      await this.harvestRepository.delete({});
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async updateStock(
    queryRunner: QueryRunner,
    info: {
      cropId: any;
      amount: number;
      type_update: 'increment' | 'decrement';
    },
  ) {
    const { cropId, amount, type_update } = info;

    this.logger.log(
      `Actualizando stock para cropId: ${cropId} con tipo: ${type_update} y cantidad: ${amount}`,
    );

    const crop = await queryRunner.manager.findOne(Crop, {
      where: { id: cropId },
    });

    if (!crop) {
      throw new NotFoundException(`Crop with id: ${cropId} not found`);
    }

    let recordHarvestCropStock = await queryRunner.manager
    .getRepository(HarvestStock)
    .findOne({
        relations: { crop: true },
        where: { crop: { id: cropId } },
      });

    if (!recordHarvestCropStock) {
      this.logger.warn(
        `Creando nuevo registro de stock para cropId: ${cropId}`,
      );
      const newRecord = queryRunner.manager.create(HarvestStock, {
        crop: {id: cropId},
        amount: 0,
      });

      await queryRunner.manager.save(HarvestStock, newRecord);

      recordHarvestCropStock = newRecord;
    }
    if (type_update === 'increment') {
      return await queryRunner.manager.increment(
        HarvestStock,
        { crop: cropId },
        'amount',
        amount,
      );
    } else if (type_update === 'decrement') {
      const amountActually = recordHarvestCropStock?.amount ?? 0;
      if (amountActually < amount) {
        
        throw new InsufficientHarvestStockException(
          amountActually,
          recordHarvestCropStock.crop.id,
        );
      }
      await queryRunner.manager.decrement(
        HarvestStock,
        { crop: cropId },
        'amount',
        amount,
      );
    }
  }

  async validateTotalProcessed(data: {
    harvestId: string;
    currentAmount: number;
    oldAmount: number;
  }) {
    const harvest = await this.harvestRepository.findOne({
      where: { id: data.harvestId },
    });

    if (!harvest) {
      throw new NotFoundException(
        `Harvest with id ${data.harvestId} not found`,
      );
    }

    const totalProcessed = await this.harvestRepository
      .createQueryBuilder('harvest')
      .leftJoin('harvest.processed', 'processed')
      .select('COALESCE(SUM(processed.amount), 0)', 'totalProcessed')
      .where('harvest.id = :harvestId', { harvestId: data.harvestId })
      .getRawOne();

    const processedSum = Number(totalProcessed?.totalProcessed || 0);

    if (processedSum - data.oldAmount + data.currentAmount > harvest.amount) {
      throw new BadRequestException(
        `You cannot add more processed harvest records, it exceeds the value of the harvest with id ${harvest.id}.`,
      );
    }
  }

  async createHarvestProcessed(createHarvestProcessedDto: HarvestProcessedDto) {
    const queryRunner = this.dataSource.createQueryRunner();

    await this.validateTotalProcessed({
      harvestId: createHarvestProcessedDto.harvest.id,
      currentAmount: createHarvestProcessedDto.amount,
      oldAmount: 0,
    });

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const harvestProcessed = queryRunner.manager.create(
        HarvestProcessed,
        createHarvestProcessedDto,
      );
      await queryRunner.manager.save(HarvestProcessed, harvestProcessed);
      const { crop, amount } = createHarvestProcessedDto;

      await this.updateStock(queryRunner, {
        cropId: crop.id,
        amount: amount,
        type_update: 'increment',
      });

      await queryRunner.commitTransaction();

      return await this.findOneHarvestProcessed(harvestProcessed.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
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
    updateHarvestProcessedDto: HarvestProcessedDto,
  ) {
    const harvestProcessed = await this.findOneHarvestProcessed(id);

    const queryRunner = this.dataSource.createQueryRunner();

    await this.validateTotalProcessed({
      harvestId: harvestProcessed.harvest.id,
      oldAmount: harvestProcessed.amount,
      currentAmount: updateHarvestProcessedDto.amount,
    });

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.updateStock(queryRunner, {
        cropId: harvestProcessed.crop.id,
        amount: harvestProcessed.amount,
        type_update: 'decrement',
      });

      await queryRunner.manager.update(
        HarvestProcessed,
        { id },
        updateHarvestProcessedDto,
      );

      const { amount } = updateHarvestProcessedDto;

      await this.updateStock(queryRunner, {
        cropId: harvestProcessed.crop.id,
        amount: amount,
        type_update: 'increment',
      });

      await queryRunner.commitTransaction();
      return await this.findOneHarvestProcessed(harvestProcessed.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
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
      await queryRunner.manager.remove(harvestProcessed);

      const { crop } = harvestProcessed;

      await this.updateStock(queryRunner, {
        cropId: crop.id,
        amount: harvestProcessed.amount,
        type_update: 'decrement',
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async removeBulk(removeBulkHarvestsDto: RemoveBulkRecordsDto<Harvest>) {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const { id } of removeBulkHarvestsDto.recordsIds) {
      try {
        await this.remove(id);
        success.push(id);
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }

    return { success, failed };
  }

  async exportHarvestToPDF(id: string) {
    const harvest = await this.findOne(id);
    const docDefinition = getHarvestReport({ data: harvest });
    return this.printerService.createPdf({ docDefinition });
  }

  async getHarvestDataForYear(
    year: number,
    cropId: string,
    employeeId: string,
  ) {
    const queryBuilder = this.harvestRepository
      .createQueryBuilder('harvest')
      .leftJoin('harvest.crop', 'crop')
      .leftJoin('harvest.details', 'details')
      .leftJoin('details.employee', 'employee')
      .select([
        'CAST(EXTRACT(MONTH FROM harvest.date) AS INTEGER) as month',
        'CAST(SUM(DISTINCT harvest.amount) AS INTEGER) as amount',
        'CAST(SUM(DISTINCT harvest.value_pay) AS INTEGER) as value_pay',
      ])
      .where('EXTRACT(YEAR FROM harvest.date) = :year', { year })
      .groupBy('EXTRACT(MONTH FROM harvest.date)')
      .orderBy('month', 'ASC');

    if (cropId) {
      queryBuilder.andWhere('crop.id = :cropId', { cropId });
    }
    if (employeeId) {
      queryBuilder.andWhere('employee.id = :employeeId', { employeeId });
    }

    const rawData = await queryBuilder.getRawMany();

    const formatData = monthNamesES.map((monthName: string, index: number) => {
      const monthNumber = index + 1;
      const record = rawData.find((item) => {
        return item.month === monthNumber;
      });

      if (!record) {
        return {
          month_name: monthName,
          month_number: monthNumber,
          amount: 0,
          value_pay: 0,
        };
      }

      delete record.month;

      return {
        ...record,
        month_name: monthName,
        month_number: monthNumber,
      };
    });

    return formatData;
  }

  async findTotalHarvestInYear({
    year = 2025,
    crop = '' as UUID,
    employee = '' as UUID,
  }: QueryParamsTotalHarvestsInYearDto) {
    const previousYear = year - 1;

    const currentYearData = await this.getHarvestDataForYear(
      year,
      crop,
      employee,
    );
    const previousYearData = await this.getHarvestDataForYear(
      previousYear,
      crop,
      employee,
    );

    const harvestDataByYear = [
      { year, data: currentYearData },
      { year: previousYear, data: previousYearData },
    ];

    const growthResult = calculateGrowthHarvest({
      last_year: { year: year, data: currentYearData },
      previous_year: { year: previousYear, data: previousYearData },
    });

    return {
      growth: growthResult,
      years: harvestDataByYear,
    };
  }
}
