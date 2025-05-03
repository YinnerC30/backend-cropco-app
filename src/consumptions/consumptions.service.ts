import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { organizeIDsToUpdateEntity } from 'src/common/helpers';

import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { monthNamesES } from 'src/common/utils/monthNamesEs';
import { Supply } from 'src/supplies/entities/supply.entity';
import { Condition } from 'src/supplies/interfaces/condition.interface';
import { SuppliesService } from 'src/supplies/supplies.service';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { ConsumptionSuppliesDetailsDto } from './dto/consumption-supplies-details.dto';
import { ConsumptionSuppliesDto } from './dto/consumption-supplies.dto';
import { QueryParamsConsumption } from './dto/query-params-consumption.dto';
import { SuppliesConsumptionDetails } from './entities/supplies-consumption-details.entity';
import { SuppliesConsumption } from './entities/supplies-consumption.entity';
import { getComparisonOperator } from 'src/common/helpers/get-comparison-operator';

@Injectable()
export class ConsumptionsService {
  private readonly logger = new Logger('ConsumptionsService');

  constructor(
    @InjectRepository(Supply)
    private readonly supplyRepository: Repository<Supply>,
    @InjectRepository(SuppliesConsumption)
    private readonly suppliesConsumptionRepository: Repository<SuppliesConsumption>,
    @InjectRepository(SuppliesConsumptionDetails)
    private readonly suppliesConsumptionDetailsRepository: Repository<SuppliesConsumptionDetails>,

    private readonly suppliesService: SuppliesService,
    private readonly handlerError: HandlerErrorService,

    private dataSource: DataSource,
  ) {
    this.handlerError.setLogger(this.logger);
  }

  async createConsumption(
    createConsumptionSuppliesDto: ConsumptionSuppliesDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { details, ...rest } = createConsumptionSuppliesDto;

      let consumptionDetails: SuppliesConsumptionDetails[] = [];

      for (const register of details) {
        consumptionDetails.push(
          queryRunner.manager.create(SuppliesConsumptionDetails, {
            ...register,
          }),
        );
      }

      const consumption = queryRunner.manager.create(SuppliesConsumption, {
        ...rest,
      });

      consumption.details = consumptionDetails;

      await queryRunner.manager.save(consumption);

      for (const item of details) {
        await this.suppliesService.updateStock(queryRunner, {
          supplyId: item.supply.id,
          amount: item.amount,
          type_update: 'decrement',
        });
      }

      await queryRunner.commitTransaction();
      return consumption;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAllConsumptions(queryParams: QueryParamsConsumption) {
    const {
      limit = 10,
      offset = 0,

      filter_by_date = false,
      type_filter_date,
      date,

      crops = [],
      supplies = [],
    } = queryParams;

    const queryBuilder = this.suppliesConsumptionRepository
      .createQueryBuilder('supplies_consumption')
      .withDeleted()
      .leftJoinAndSelect('supplies_consumption.details', 'details')
      .leftJoinAndSelect('details.supply', 'supply')
      .leftJoinAndSelect('details.crop', 'crop')
      .orderBy('supplies_consumption.date', 'DESC')
      .take(limit)
      .skip(offset * limit);

    filter_by_date &&
      queryBuilder.andWhere(
        `supplies_consumption.date ${getComparisonOperator(type_filter_date)} :date`,
        { date },
      );

    crops.length > 0 &&
      queryBuilder.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('sc.id')
          .from('supplies_consumption', 'sc')
          .leftJoin('sc.details', 'd')
          .leftJoin('d.crop', 'c')
          .where('c.id IN (:...crops)', { crops })
          .getQuery();
        return 'supplies_consumption.id IN ' + subQuery;
      });

    supplies.length > 0 &&
      queryBuilder.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('sc.id')
          .from('supplies_consumption', 'sc')
          .leftJoin('sc.details', 'd')
          .leftJoin('d.supply', 's')
          .where('s.id IN (:...supplies)', { supplies })
          .getQuery();
        return 'supplies_consumption.id IN ' + subQuery;
      });

    const [consumptions, count] = await queryBuilder.getManyAndCount();

    if (consumptions.length === 0 && count > 0) {
      throw new NotFoundException(
        'There are no consumption records with the requested pagination',
      );
    }

    return {
      total_row_count: count,
      current_row_count: consumptions.length,
      total_page_count: Math.ceil(count / limit),
      current_page_count: consumptions.length > 0 ? offset + 1 : 0,
      records: consumptions,
    };
  }

  async findOneConsumption(id: string) {
    const supplyConsumption = await this.suppliesConsumptionRepository.findOne({
      withDeleted: true,
      where: { id },
      relations: {
        details: {
          crop: true,
          supply: true,
        },
      },
    });
    if (!supplyConsumption)
      throw new NotFoundException(
        `Supplies consumption with id: ${id} not found`,
      );
    return supplyConsumption;
  }

  async createConsumptionDetails(
    queryRunner: QueryRunner,
    object: ConsumptionSuppliesDetailsDto,
  ) {
    const recordToSave = queryRunner.manager.create(
      SuppliesConsumptionDetails,
      object,
    );
    return await queryRunner.manager.save(
      SuppliesConsumptionDetails,
      recordToSave,
    );
  }

  async updateConsumptionDetails(
    queryRunner: QueryRunner,
    condition: Condition,
    object: ConsumptionSuppliesDetailsDto,
  ) {
    return await queryRunner.manager.update(
      SuppliesConsumptionDetails,
      condition,
      object,
    );
  }

  async removeConsumptionDetails(
    queryRunner: QueryRunner,
    condition: Condition,
  ) {
    return await queryRunner.manager.delete(
      SuppliesConsumptionDetails,
      condition,
    );
  }

  async updateConsumption(
    id: string,
    updateSuppliesConsumptionDto: ConsumptionSuppliesDto,
  ) {
    const consumption: SuppliesConsumption = await this.findOneConsumption(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldDetails: SuppliesConsumptionDetails[] = consumption.details;
      const newDetails: ConsumptionSuppliesDetailsDto[] =
        updateSuppliesConsumptionDto.details;

      const oldIDsConsumptionDetails: string[] = oldDetails.map(
        (record: SuppliesConsumptionDetails) => record.id,
      );
      const newIDsConsumptionDetails: string[] = newDetails.map((record) =>
        new String(record.id).toString(),
      );

      const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
        newIDsConsumptionDetails,
        oldIDsConsumptionDetails,
      );

      for (const detailId of toDelete) {
        const oldRecordData: SuppliesConsumptionDetails = oldDetails.find(
          (record: SuppliesConsumptionDetails) => record.id === detailId,
        );

        if (oldRecordData.deletedDate !== null) {
          throw new BadRequestException(
            `You cannot delete the record with id ${detailId}, it is linked to other records.`,
          );
        }

        await this.suppliesService.updateStock(queryRunner, {
          supplyId: oldRecordData.supply.id,
          amount: oldRecordData.amount,
          type_update: 'increment',
        });

        await this.removeConsumptionDetails(queryRunner, {
          id: detailId,
        });
      }

      for (const detailId of toUpdate) {
        const oldRecordData: SuppliesConsumptionDetails = oldDetails.find(
          (record: SuppliesConsumptionDetails) => record.id === detailId,
        );

        if (oldRecordData.deletedDate !== null) {
          throw new BadRequestException(
            `You cannot update the record with id ${detailId} , it is linked to other records.`,
          );
        }

        await this.suppliesService.updateStock(queryRunner, {
          supplyId: oldRecordData.supply.id,
          amount: oldRecordData.amount,
          type_update: 'increment',
        });

        const newRecordData = newDetails.find(
          (record) => record.id === detailId,
        );

        await this.suppliesService.updateStock(queryRunner, {
          supplyId: newRecordData.supply.id,
          amount: newRecordData.amount,
          type_update: 'decrement',
        });

        await this.updateConsumptionDetails(
          queryRunner,
          { id: detailId },
          { ...newRecordData },
        );
      }

      for (const detailId of toCreate) {
        const newRecordData = newDetails.find(
          (record) => record.id === detailId,
        );

        await this.createConsumptionDetails(queryRunner, {
          consumption: id,
          ...newRecordData,
        });

        await this.suppliesService.updateStock(queryRunner, {
          supplyId: newRecordData.supply.id,
          amount: newRecordData.amount,
          type_update: 'decrement',
        });
      }

      const { details, ...rest } = updateSuppliesConsumptionDto;
      await queryRunner.manager.update(SuppliesConsumption, { id }, rest);

      await queryRunner.commitTransaction();
      return await this.findOneConsumption(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error);
    } finally {
      await queryRunner.release();
    }
  }

  async removeConsumption(id: string) {
    const consumptionSupply: SuppliesConsumption =
      await this.findOneConsumption(id);

    const { details } = consumptionSupply;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const record of details) {
        if (record.supply.deletedDate !== null) {
          continue;
        }

        await this.suppliesService.updateStock(queryRunner, {
          supplyId: record.supply.id,
          amount: record.amount,
          type_update: 'increment',
        });
      }
      await queryRunner.manager.remove(consumptionSupply);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAllConsumptionSupplies() {
    try {
      await this.suppliesConsumptionRepository.delete({});
    } catch (error) {
      this.handlerError.handle(error);
    }
  }

  async removeBulkConsumption(
    removeBulkConsumptionDto: RemoveBulkRecordsDto<SuppliesConsumption>,
  ) {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const { id } of removeBulkConsumptionDto.recordsIds) {
      try {
        await this.removeConsumption(id);
        success.push(id);
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }

    return { success, failed };
  }

  async findTotalConsumptionsInYearAndPreviousYear({
    year = 2025,
    crop = '',
    supply = '',
  }: any) {
    const previousYear = year - 1;

    const getHarvestData = async (
      year: number,
      cropId: string,
      supplyId: string,
    ) => {
      const queryBuilder = this.suppliesConsumptionRepository
        .createQueryBuilder('consumptions')
        .leftJoin('consumptions.details', 'details')
        .leftJoin('details.crop', 'crop')
        .leftJoin('details.supply', 'supply')
        .select([
          'CAST(EXTRACT(MONTH FROM consumptions.date) AS INTEGER) as month',
          'CAST(COUNT(consumptions) AS INTEGER) as quantity_consumptions',
        ])
        .where('EXTRACT(YEAR FROM consumptions.date) = :year', { year })
        .groupBy('EXTRACT(MONTH FROM consumptions.date)')
        .orderBy('month', 'ASC');

      if (cropId) {
        queryBuilder.andWhere('crop.id = :cropId', { cropId });
      }
      if (supplyId) {
        queryBuilder.andWhere('supply.id = :supplyId', { supplyId });
      }

      const rawData = await queryBuilder.getRawMany();

      const formatData = monthNamesES.map(
        (monthName: string, index: number) => {
          const monthNumber = index + 1;
          const record = rawData.find((item) => {
            return item.month === monthNumber;
          });

          if (!record) {
            return {
              month_name: monthName,
              month_number: monthNumber,
              quantity_consumptions: 0,
            };
          }

          delete record.month;

          return {
            ...record,
            month_name: monthName,
            month_number: monthNumber,
          };
        },
      );

      return formatData;
    };

    const currentYearData = await getHarvestData(year, crop, supply);
    const previousYearData = await getHarvestData(previousYear, crop, supply);

    const saleDataByYear = [
      { year, data: currentYearData },
      { year: previousYear, data: previousYearData },
    ];

    return {
      years: saleDataByYear,
    };
  }
}
