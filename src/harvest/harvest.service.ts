import {
  BadRequestException,
  ConflictException,
  Inject,
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
import { BaseTenantService } from 'src/common/services/base-tenant.service';
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
import {
  UnitConversionService,
  UnitType,
  MassUnit,
} from 'src/common/unit-conversion/unit-conversion.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class HarvestService extends BaseTenantService {
  protected readonly logger = new Logger('HarvestsService');
  private harvestRepository: Repository<Harvest>;
  private harvestProcessedRepository: Repository<HarvestProcessed>;
  private dataSource: DataSource;

  constructor(
    @Inject(REQUEST) request: Request,
    private readonly printerService: PrinterService,
    private handlerError: HandlerErrorService,
    private readonly unitConversionService: UnitConversionService,
  ) {
    super(request);
    this.setLogger(this.logger);
    this.dataSource = this.tenantConnection;
    this.harvestRepository = this.getTenantRepository(Harvest);
    this.harvestProcessedRepository =
      this.getTenantRepository(HarvestProcessed);
  }

  async create(createHarvestDto: HarvestDto) {
    this.logWithContext(
      `Creating new harvest with ${createHarvestDto.details?.length || 0} details`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { details, ...rest } = createHarvestDto;

      const harvest = queryRunner.manager.create(Harvest, { ...rest });
      harvest.details = details.map((harvestDetailsDto: HarvestDetailsDto) =>
        queryRunner.manager.create(HarvestDetails, harvestDetailsDto),
      );

      const totalAmountInGrams = details.reduce((total, detail) => {
        const amountInGrams = this.unitConversionService.convert(
          detail.amount,
          detail.unit_of_measure,
          'GRAMOS',
        );
        return total + amountInGrams;
      }, 0);

      harvest.amount = totalAmountInGrams;

      const savedHarvest = await queryRunner.manager.save(harvest);
      await queryRunner.commitTransaction();

      this.logWithContext(
        `Harvest created successfully with ID: ${savedHarvest.id}, total amount: ${totalAmountInGrams} GRAMOS`,
      );

      return savedHarvest;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logWithContext(
        `Failed to create harvest with ${createHarvestDto.details?.length || 0} details`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    queryParams: QueryParamsHarvest,
  ): Promise<TemplateGetAllRecords<Harvest>> {
    this.logWithContext(
      `Finding all harvests with complex filters - crop: ${queryParams.crop || 'any'}, employees: ${queryParams.employees?.length || 0}, filter_by_date: ${queryParams.filter_by_date || false}, filter_by_amount: ${queryParams.filter_by_amount || false}`,
    );

    try {
      const {
        limit = 10,
        offset = 0,
        crop = '',
        filter_by_date = false,
        type_filter_date,
        date,
        filter_by_amount = false,
        type_filter_amount,
        type_unit_of_measure = 'KILOGRAMOS',
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

      const amountConverted = this.unitConversionService.convert(
        amount,
        type_unit_of_measure,
        'GRAMOS',
      );

      filter_by_amount &&
        queryBuilder.andWhere(
          `harvest.amount ${getComparisonOperator(type_filter_amount)} :amount`,
          { amount: amountConverted },
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

      this.logWithContext(
        `Found ${harvest.length} harvests out of ${count} total harvests`,
      );

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
    } catch (error) {
      this.logWithContext(
        'Failed to find harvests with complex filters',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOne(id: string) {
    this.logWithContext(`Finding harvest by ID: ${id}`);

    try {
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

      if (!harvest) {
        this.logWithContext(`Harvest with ID: ${id} not found`, 'warn');
        throw new NotFoundException(`Harvest with id: ${id} not found`);
      }

      const total_amount_processed = harvest.processed.reduce(
        (accumulator, currentValue) => {
          const convertedValue = this.unitConversionService.convert(
            currentValue.amount,
            currentValue.unit_of_measure,
            'GRAMOS',
          );
          return accumulator + convertedValue;
        },
        0,
      );

      this.logWithContext(
        `Harvest found successfully with ID: ${id}, processed amount: ${total_amount_processed} GRAMOS`,
      );

      return { ...harvest, total_amount_processed };
    } catch (error) {
      this.logWithContext(`Failed to find harvest with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async update(id: string, updateHarvestDto: HarvestDto) {
    this.logWithContext(`Updating harvest with ID: ${id}`);

    try {
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

        this.logWithContext(
          `Harvest update operations - Create: ${toCreate.length}, Update: ${toUpdate.length}, Delete: ${toDelete.length}`,
        );

        for (const recordId of toDelete) {
          const dataRecordOld = oldHarvestDetails.find(
            (record) => record.id === recordId,
          );

          if (dataRecordOld.payment_is_pending === false) {
            this.logWithContext(
              `Cannot delete harvest detail ${recordId} - linked to payment`,
              'warn',
            );
            throw new BadRequestException(
              `You cannot delete the record with id ${recordId} , it is linked to a payment record.`,
            );
          }

          if (dataRecordOld.deletedDate !== null) {
            this.logWithContext(
              `Cannot delete harvest detail ${recordId} - linked to other records`,
              'warn',
            );
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
                this.logWithContext(
                  `Cannot update harvest detail ${recordId} - linked to payment`,
                  'warn',
                );
                throw new BadRequestException(
                  `You cannot update the record with id ${recordId} , it is linked to a payment record.`,
                );
              case dataRecordOld.deletedDate !== null:
                this.logWithContext(
                  `Cannot update harvest detail ${recordId} - linked to other records`,
                  'warn',
                );
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
            ...dataRecord,
            harvest,
          });

          await queryRunner.manager.save(recordToCreate);
        }

        const totalAmountInGrams = newHarvestDetails.reduce((total, detail) => {
          const amountInGrams = this.unitConversionService.convert(
            detail.amount,
            detail.unit_of_measure,
            'GRAMOS',
          );
          return total + amountInGrams;
        }, 0);

        const { details, crop, ...rest } = updateHarvestDto;
        await queryRunner.manager.update(
          Harvest,
          { id },
          { ...rest, amount: totalAmountInGrams },
        );

        await queryRunner.commitTransaction();

        this.logWithContext(
          `Harvest updated successfully with ID: ${id}, new total amount: ${totalAmountInGrams} GRAMOS`,
        );

        return await this.findOne(id);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logWithContext(`Failed to update harvest with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    this.logWithContext(`Attempting to remove harvest with ID: ${id}`);

    try {
      const harvest: Harvest = await this.findOne(id);

      if (harvest.processed.length > 0) {
        this.logWithContext(
          `Cannot remove harvest with ID: ${id} - has ${harvest.processed.length} processed records`,
          'warn',
        );
        throw new ConflictException(
          `The record with id ${harvest.id} cannot be deleted because it has processed records linked to it.`,
        );
      }

      if (harvest.details.some((item) => item.payments_harvest !== null)) {
        this.logWithContext(
          `Cannot remove harvest with ID: ${id} - has payments linked`,
          'warn',
        );
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

        this.logWithContext(`Harvest with ID: ${id} removed successfully`);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logWithContext(`Failed to remove harvest with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async deleteAllHarvest() {
    this.logWithContext(
      'Deleting ALL harvests - this is a destructive operation',
      'warn',
    );

    try {
      await this.harvestRepository.delete({});
      this.logWithContext('All harvests deleted successfully');
    } catch (error) {
      this.logWithContext('Failed to delete all harvests', 'error');
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

    this.logWithContext(
      `Updating harvest stock for crop ID: ${cropId}, operation: ${type_update}, amount: ${amount} GRAMOS`,
    );

    try {
      const crop = await queryRunner.manager.findOne(Crop, {
        where: { id: cropId },
      });

      if (!crop) {
        this.logWithContext(
          `Crop with ID: ${cropId} not found for stock update`,
          'warn',
        );
        throw new NotFoundException(`Crop with id: ${cropId} not found`);
      }

      let recordHarvestCropStock = await queryRunner.manager.findOne(
        HarvestStock,
        {
          where: { crop: { id: cropId } },
          relations: ['crop'],
        },
      );

      if (!recordHarvestCropStock) {
        this.logWithContext(
          `Creating new harvest stock record for crop ID: ${cropId}`,
        );
        const newRecord = queryRunner.manager.create(HarvestStock, {
          crop: crop,
          amount: 0,
        });

        await queryRunner.manager.save(HarvestStock, newRecord);
        recordHarvestCropStock = newRecord;
      }

      if (type_update === 'increment') {
        const result = await queryRunner.manager.increment(
          HarvestStock,
          { crop: cropId },
          'amount',
          amount,
        );

        if (result.affected === 0) {
          this.logWithContext(
            `Failed to increment harvest stock for crop ID: ${cropId}`,
            'error',
          );
          throw new NotFoundException(
            `Crop with id: ${cropId} not incremented`,
          );
        }

        this.logWithContext(
          `Harvest stock incremented successfully for crop ID: ${cropId}, added: ${amount} GRAMOS`,
        );
      } else if (type_update === 'decrement') {
        const amountActually = recordHarvestCropStock.amount;

        if (amountActually < amount) {
          this.logWithContext(
            `Insufficient harvest stock for crop ID: ${cropId}, available: ${amountActually}, requested: ${amount}`,
            'warn',
          );
          throw new InsufficientHarvestStockException(amountActually, crop.id);
        }

        const result = await queryRunner.manager.decrement(
          HarvestStock,
          { crop: cropId },
          'amount',
          amount,
        );

        if (result.affected === 0) {
          this.logWithContext(
            `Failed to decrement harvest stock for crop ID: ${cropId}`,
            'error',
          );
          throw new NotFoundException(
            `Crop with id: ${cropId} not decremented`,
          );
        }

        this.logWithContext(
          `Harvest stock decremented successfully for crop ID: ${cropId}, removed: ${amount} GRAMOS`,
        );
      }
    } catch (error) {
      this.logWithContext(
        `Failed to update harvest stock for crop ID: ${cropId}, operation: ${type_update}`,
        'error',
      );
      // Re-throw the error since this method is used in transactions
      throw error;
    }
  }

  private async validateTotalProcessed(data: {
    harvestId: string;
    currentAmount: number;
    oldAmount: number;
    inputCurrentUnit: MassUnit;
    inputOldUnit: MassUnit;
  }) {
    this.logWithContext(
      `Validating total processed for harvest ID: ${data.harvestId}, current: ${data.currentAmount} ${data.inputCurrentUnit}, old: ${data.oldAmount} ${data.inputOldUnit}`,
    );

    try {
      const harvest = await this.harvestRepository.findOne({
        where: { id: data.harvestId },
      });

      if (!harvest) {
        this.logWithContext(
          `Harvest with ID: ${data.harvestId} not found for validation`,
          'warn',
        );
        throw new NotFoundException(
          `Harvest with id ${data.harvestId} not found`,
        );
      }

      const harvestWithProcessed = await this.harvestRepository
        .createQueryBuilder('harvest')
        .leftJoinAndSelect('harvest.processed', 'processed')
        .where('harvest.id = :harvestId', { harvestId: data.harvestId })
        .getOne();

      const convertedOldResult = this.unitConversionService.convert(
        data.oldAmount,
        data.inputOldUnit,
        'GRAMOS',
      );
      const convertedCurrentResult = this.unitConversionService.convert(
        data.currentAmount,
        data.inputCurrentUnit,
        'GRAMOS',
      );
      let processedSum: number = 0;
      if (harvestWithProcessed.processed.length > 0) {
        processedSum = harvestWithProcessed.processed.reduce(
          (prev, current) => {
            const convertedValue = this.unitConversionService.convert(
              current.amount,
              current.unit_of_measure,
              'GRAMOS',
            );
            return convertedValue + prev;
          },
          0,
        );
      }
      const currentStock = processedSum - convertedOldResult;

      if (currentStock + convertedCurrentResult > harvest.amount) {
        this.logWithContext(
          `Validation failed - exceeds harvest limit. Available: ${harvest.amount - currentStock} GRAMOS, requested: ${convertedCurrentResult} GRAMOS`,
          'warn',
        );
        throw new ConflictException(
          `You cannot add more processed harvest records, it exceeds the value of the harvest with id ${harvest.id}, only available ${harvest.amount - currentStock} GRAMOS.`,
        );
      }

      this.logWithContext(
        `Validation successful for harvest ID: ${data.harvestId}`,
      );
    } catch (error) {
      this.logWithContext(
        `Failed to validate total processed for harvest ID: ${data.harvestId}`,
        'error',
      );
      throw error;
    }
  }

  async createHarvestProcessed(createHarvestProcessedDto: HarvestProcessedDto) {
    this.logWithContext(
      `Creating harvest processed for harvest ID: ${createHarvestProcessedDto.harvest.id}, amount: ${createHarvestProcessedDto.amount} ${createHarvestProcessedDto.unit_of_measure}`,
    );

    try {
      await this.validateTotalProcessed({
        harvestId: createHarvestProcessedDto.harvest.id,
        currentAmount: createHarvestProcessedDto.amount,
        oldAmount: 0,
        inputCurrentUnit: createHarvestProcessedDto.unit_of_measure,
        inputOldUnit: 'GRAMOS',
      });

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const harvestProcessed = queryRunner.manager.create(
          HarvestProcessed,
          createHarvestProcessedDto,
        );
        const savedHarvestProcessed = await queryRunner.manager.save(
          HarvestProcessed,
          harvestProcessed,
        );
        const { crop, amount, unit_of_measure } = createHarvestProcessedDto;

        const resultConverted = this.unitConversionService.convert(
          amount,
          unit_of_measure,
          'GRAMOS',
        );

        await this.updateStock(queryRunner, {
          cropId: crop.id,
          amount: resultConverted,
          type_update: 'increment',
        });

        await queryRunner.commitTransaction();

        this.logWithContext(
          `Harvest processed created successfully with ID: ${savedHarvestProcessed.id}`,
        );

        return await this.findOneHarvestProcessed(savedHarvestProcessed.id);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logWithContext(
        `Failed to create harvest processed for harvest ID: ${createHarvestProcessedDto.harvest.id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOneHarvestProcessed(id: string) {
    this.logWithContext(`Finding harvest processed by ID: ${id}`);

    try {
      const harvestProcessed = await this.harvestProcessedRepository.findOne({
        where: {
          id,
        },
        relations: {
          crop: true,
          harvest: true,
        },
      });

      if (!harvestProcessed) {
        this.logWithContext(
          `Harvest processed with ID: ${id} not found`,
          'warn',
        );
        throw new NotFoundException(
          `Harvest processed with id: ${id} not found`,
        );
      }

      this.logWithContext(
        `Harvest processed found successfully with ID: ${id}`,
      );
      return harvestProcessed;
    } catch (error) {
      this.logWithContext(
        `Failed to find harvest processed with ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async updateHarvestProcessed(
    id: string,
    updateHarvestProcessedDto: HarvestProcessedDto,
  ) {
    this.logWithContext(`Updating harvest processed with ID: ${id}`);

    try {
      const harvestProcessed = await this.findOneHarvestProcessed(id);

      await this.validateTotalProcessed({
        harvestId: harvestProcessed.harvest.id,
        oldAmount: harvestProcessed.amount,
        currentAmount: updateHarvestProcessedDto.amount,
        inputCurrentUnit: updateHarvestProcessedDto.unit_of_measure,
        inputOldUnit: harvestProcessed.unit_of_measure,
      });

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const resultOldConverted = this.unitConversionService.convert(
          harvestProcessed.amount,
          harvestProcessed.unit_of_measure,
          'GRAMOS',
        );

        await this.updateStock(queryRunner, {
          cropId: harvestProcessed.crop.id,
          amount: resultOldConverted,
          type_update: 'decrement',
        });

        await queryRunner.manager.update(
          HarvestProcessed,
          { id },
          updateHarvestProcessedDto,
        );

        const { amount } = updateHarvestProcessedDto;

        const resultConverted = this.unitConversionService.convert(
          amount,
          updateHarvestProcessedDto.unit_of_measure,
          'GRAMOS',
        );

        await this.updateStock(queryRunner, {
          cropId: harvestProcessed.crop.id,
          amount: resultConverted,
          type_update: 'increment',
        });

        await queryRunner.commitTransaction();

        this.logWithContext(
          `Harvest processed updated successfully with ID: ${id}`,
        );

        return await this.findOneHarvestProcessed(harvestProcessed.id);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logWithContext(
        `Failed to update harvest processed with ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeHarvestProcessed(id: string) {
    this.logWithContext(
      `Attempting to remove harvest processed with ID: ${id}`,
    );

    try {
      const harvestProcessed: HarvestProcessed =
        await this.findOneHarvestProcessed(id);

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await queryRunner.manager.remove(harvestProcessed);

        const { crop, amount, unit_of_measure } = harvestProcessed;

        const resultConverted = this.unitConversionService.convert(
          amount,
          unit_of_measure,
          'GRAMOS',
        );

        await this.updateStock(queryRunner, {
          cropId: crop.id,
          amount: resultConverted,
          type_update: 'decrement',
        });

        await queryRunner.commitTransaction();

        this.logWithContext(
          `Harvest processed with ID: ${id} removed successfully`,
        );
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logWithContext(
        `Failed to remove harvest processed with ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulk(removeBulkHarvestsDto: RemoveBulkRecordsDto<Harvest>) {
    this.logWithContext(
      `Starting bulk removal of ${removeBulkHarvestsDto.recordsIds.length} harvests`,
    );

    try {
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

      this.logWithContext(
        `Bulk removal completed. Success: ${success.length}, Failed: ${failed.length}`,
      );

      return { success, failed };
    } catch (error) {
      this.logWithContext(
        'Failed to execute bulk removal of harvests',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async exportHarvestToPDF(id: string, subdomain: string) {
    this.logWithContext(`Exporting harvest to PDF for ID: ${id}`);

    try {
      const harvest = await this.findOne(id);
      const docDefinition = getHarvestReport({
        data: {
          ...harvest,
          amount: this.unitConversionService.convert(
            harvest.amount,
            'GRAMOS',
            'KILOGRAMOS',
          ),
          total_amount_processed: this.unitConversionService.convert(
            harvest.total_amount_processed,
            'GRAMOS',
            'KILOGRAMOS',
          ),
        },
        subdomain,
      });
      const pdfDoc = this.printerService.createPdf({
        docDefinition,
        title: 'Registro de cosecha',
        keywords: 'report-harvest',
      });

      this.logWithContext(`Harvest PDF exported successfully for ID: ${id}`);
      return pdfDoc;
    } catch (error) {
      this.logWithContext(
        `Failed to export harvest PDF for ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  private async getHarvestDataForYear(
    year: number,
    cropId: string,
    employeeId: string,
  ) {
    this.logWithContext(
      `Getting harvest data for year: ${year}, crop: ${cropId || 'any'}, employee: ${employeeId || 'any'}`,
    );

    try {
      const queryBuilder = this.harvestRepository
        .createQueryBuilder('harvest')
        .leftJoin('harvest.crop', 'crop')
        .leftJoin('harvest.details', 'details')
        .leftJoin('details.employee', 'employee')
        .select([
          'CAST(EXTRACT(MONTH FROM harvest.date) AS INTEGER) as month',
          'SUM(convert_to_grams(details.unit_of_measure::TEXT, details.amount::NUMERIC)) AS amount',
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
        },
      );

      this.logWithContext(
        `Harvest data retrieved successfully for year: ${year}, ${rawData.length} months with data`,
      );

      return formatData;
    } catch (error) {
      this.logWithContext(
        `Failed to get harvest data for year: ${year}`,
        'error',
      );
      throw error;
    }
  }

  async findTotalHarvestInYear({
    year = new Date().getFullYear(),
    crop = '' as UUID,
    employee = '' as UUID,
  }: QueryParamsTotalHarvestsInYearDto) {
    this.logWithContext(
      `Finding total harvest in year: ${year} with crop: ${crop || 'any'}, employee: ${employee || 'any'}`,
    );

    try {
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

      this.logWithContext(
        `Total harvest data calculated successfully for year: ${year}`,
      );

      return {
        growth: growthResult,
        years: harvestDataByYear,
      };
    } catch (error) {
      this.logWithContext(
        `Failed to find total harvest in year: ${year}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }
}
