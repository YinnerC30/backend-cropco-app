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

import { organizeIDsToUpdateEntity } from 'src/common/helpers/organize-ids-to-update-entity';
import { HarvestDetailsDto } from './dto/create-harvest-details.dto';

import { UUID } from 'node:crypto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { getComparisonOperator } from 'src/common/helpers/get-comparison-operator';
import { TemplateGetAllRecords } from 'src/common/interfaces/TemplateGetAllRecords';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { monthNamesES } from 'src/common/utils/monthNamesEs';
import { PrinterService } from 'src/printer/printer.service';
import { CreateHarvestProcessedDto } from './dto/create-harvest-processed.dto';
import { QueryParamsHarvest } from './dto/query-params-harvest.dto';
import { QueryParamsTotalHarvestsInYearDto } from './dto/query-params-total-harvests-year';
import { UpdateHarvestProcessedDto } from './dto/update-harvest-processed.dto';
import { HarvestProcessed } from './entities/harvest-processed.entity';
import { HarvestStock } from './entities/harvest-stock.entity';
import { InsufficientHarvestStockException } from './exceptions/insufficient-harvest-stock';
import { calculateGrowthHarvest } from './helpers/calculateGrowthHarvest';
import { getHarvestReport } from './reports/get-harvest';

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
    private readonly handlerError: HandlerErrorService,
  ) {
    this.handlerError.setLogger(this.logger);
  }

  async create(createHarvestDto: CreateHarvestDto) {
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
      console.log(error);
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error);
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

      filter_by_total = false,
      type_filter_total,
      total,

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

    filter_by_total &&
      queryBuilder.andWhere(
        `harvest.total ${getComparisonOperator(type_filter_total)} :total`,
        { total },
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
      (accumulator, currentValue) => accumulator + currentValue.total,
      0,
    );
    return { ...harvest, total_processed };
  }

  async update(id: string, updateHarvestDto: UpdateHarvestDto) {
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

        const valuesAreDifferent =
          dataRecordNew.total !== dataRecordOld.total ||
          dataRecordNew.value_pay !== dataRecordOld.value_pay;

        if (
          (dataRecordOld.deletedDate !== null ||
            dataRecordOld.payment_is_pending === false) &&
          valuesAreDifferent
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
      return await this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error);
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
      await queryRunner.manager.softRemove(Harvest, harvest);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAllHarvest() {
    try {
      await this.harvestRepository.delete({});
    } catch (error) {
      this.handlerError.handle(error);
    }
  }

  // async findAllHarvestStock() {
  //   const harvestStock = await this.harvestStockRepository.find({
  //     relations: {
  //       crop: true,
  //     },
  //   });
  //   let count: number = harvestStock.length;

  //   return {
  //     rowCount: count,
  //     rows: harvestStock.map((item) => ({
  //       id: item.crop.id,
  //       name: item.crop.name,
  //       stock: item.total,
  //     })),
  //     pageCount: count > 0 ? 1 : 0,
  //   };
  // }

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
      this.handlerError.handle(error);
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
      this.handlerError.handle(error);
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
      this.handlerError.handle(error);
    } finally {
      await queryRunner.release();
    }
  }

  async removeBulk(removeBulkHarvestsDto: RemoveBulkRecordsDto<Harvest>) {
    for (const { id } of removeBulkHarvestsDto.recordsIds) {
      await this.remove(id);
    }
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
        'CAST(SUM(DISTINCT harvest.total) AS INTEGER) as total',
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
          total: 0,
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
