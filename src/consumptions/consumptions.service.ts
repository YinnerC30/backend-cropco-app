import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { organizeIDsToUpdateEntity } from 'src/common/helpers';

import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { BaseTenantService } from 'src/common/services/base-tenant.service';
import { monthNamesES } from 'src/common/utils/monthNamesEs';
import { Supply } from 'src/supplies/entities/supply.entity';
import { Condition } from 'src/supplies/interfaces/condition.interface';
import { SuppliesService } from 'src/supplies/supplies.service';
import { DataSource, IsNull, QueryRunner, Repository } from 'typeorm';
import { ConsumptionSuppliesDetailsDto } from './dto/consumption-supplies-details.dto';
import { ConsumptionSuppliesDto } from './dto/consumption-supplies.dto';
import { QueryParamsConsumption } from './dto/query-params-consumption.dto';
import { SuppliesConsumptionDetails } from './entities/supplies-consumption-details.entity';
import { SuppliesConsumption } from './entities/supplies-consumption.entity';
import { getComparisonOperator } from 'src/common/helpers/get-comparison-operator';
import { QueryTotalConsumptionsInYearDto } from './dto/query-total-consumptions-year';
import { UnitConversionService } from 'src/common/unit-conversion/unit-conversion.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class ConsumptionsService extends BaseTenantService {
  protected readonly logger = new Logger('ConsumptionsService');
  private supplyRepository: Repository<Supply>;
  private suppliesConsumptionRepository: Repository<SuppliesConsumption>;
  private suppliesConsumptionDetailsRepository: Repository<SuppliesConsumptionDetails>;
  private dataSource: DataSource;

  constructor(
    @Inject(REQUEST) request: Request,
    private readonly suppliesService: SuppliesService,
    private readonly handlerError: HandlerErrorService,
    private readonly unitConversionService: UnitConversionService,
  ) {
    super(request);
    this.setLogger(this.logger);
    this.supplyRepository = this.getTenantRepository(Supply);
    this.suppliesConsumptionRepository =
      this.getTenantRepository(SuppliesConsumption);
    this.suppliesConsumptionDetailsRepository = this.getTenantRepository(
      SuppliesConsumptionDetails,
    );
    this.dataSource = this.tenantConnection;
  }

  async createConsumption(
    createConsumptionSuppliesDto: ConsumptionSuppliesDto,
  ) {
    this.logWithContext(
      `Creating new consumption with ${createConsumptionSuppliesDto.details?.length || 0} details`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { details, ...rest } = createConsumptionSuppliesDto;

      let consumptionDetails: SuppliesConsumptionDetails[] = [];

      for (const register of details) {
        // Verificar que la unidad de medida sea válida
        if (!this.unitConversionService.isValidUnit(register.unit_of_measure)) {
          throw new BadRequestException(
            `Unidad de medida inválida: ${register.unit_of_measure}`,
          );
        }

        // Obtener el suministro para verificar su unidad de medida
        const supply = await this.suppliesService.findOne(register.supply.id);

        // Verificar que las unidades sean del mismo tipo (masa o volumen)
        if (
          this.unitConversionService.getUnitType(register.unit_of_measure) !==
          this.unitConversionService.getUnitType(supply.unit_of_measure)
        ) {
          throw new BadRequestException(
            `No se puede convertir entre unidades de ${register.unit_of_measure} y ${supply.unit_of_measure}`,
          );
        }

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
          inputUnit: item.unit_of_measure,
        });
      }

      await queryRunner.commitTransaction();

      this.logWithContext(
        `Consumption created successfully with ID: ${consumption.id}`,
      );

      return consumption;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logWithContext(
        `Failed to create consumption with ${createConsumptionSuppliesDto.details?.length || 0} details`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async findAllConsumptions(queryParams: QueryParamsConsumption) {
    this.logWithContext(
      `Finding all consumptions with filters - crops: ${queryParams.crops?.length || 0}, supplies: ${queryParams.supplies?.length || 0}, filter_by_date: ${queryParams.filter_by_date || false}`,
    );

    try {
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
        .andWhere('supplies_consumption.deletedDate IS NULL')
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
            .withDeleted()
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
            .withDeleted()
            .select('sc.id')
            .from('supplies_consumption', 'sc')
            .leftJoin('sc.details', 'd')
            .leftJoin('d.supply', 's')
            .where('s.id IN (:...supplies)', { supplies })
            .getQuery();
          return 'supplies_consumption.id IN ' + subQuery;
        });

      const [consumptions, count] = await queryBuilder.getManyAndCount();

      this.logWithContext(
        `Found ${consumptions.length} consumption records out of ${count} total records`,
      );

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
    } catch (error) {
      this.logWithContext(
        'Failed to find consumption records with filters',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOneConsumption(id: string) {
    this.logWithContext(`Finding consumption by ID: ${id}`);

    try {
      const supplyConsumption =
        await this.suppliesConsumptionRepository.findOne({
          withDeleted: true,
          where: { id, deletedDate: IsNull() },
          relations: {
            details: {
              crop: true,
              supply: true,
            },
          },
        });

      if (!supplyConsumption) {
        this.logWithContext(`Consumption with ID: ${id} not found`, 'warn');
        throw new NotFoundException(
          `Supplies consumption with id: ${id} not found`,
        );
      }

      this.logWithContext(`Consumption found successfully with ID: ${id}`);
      return supplyConsumption;
    } catch (error) {
      this.logWithContext(`Failed to find consumption with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async createConsumptionDetails(
    queryRunner: QueryRunner,
    object: ConsumptionSuppliesDetailsDto,
  ) {
    this.logWithContext(
      `Creating consumption detail for supply: ${object.supply?.id || 'unknown'}`,
    );

    try {
      const recordToSave = queryRunner.manager.create(
        SuppliesConsumptionDetails,
        object,
      );
      const result = await queryRunner.manager.save(
        SuppliesConsumptionDetails,
        recordToSave,
      );

      this.logWithContext(
        `Consumption detail created successfully with ID: ${result.id}`,
      );

      return result;
    } catch (error) {
      this.logWithContext(
        `Failed to create consumption detail for supply: ${object.supply?.id || 'unknown'}`,
        'error',
      );
      throw error;
    }
  }

  async updateConsumptionDetails(
    queryRunner: QueryRunner,
    condition: Condition,
    object: ConsumptionSuppliesDetailsDto,
  ) {
    this.logWithContext(
      `Updating consumption details with condition: ${JSON.stringify(condition)}`,
    );

    try {
      const result = await queryRunner.manager.update(
        SuppliesConsumptionDetails,
        condition,
        object,
      );

      this.logWithContext(
        `Consumption details updated successfully, affected rows: ${result.affected}`,
      );

      return result;
    } catch (error) {
      this.logWithContext(
        `Failed to update consumption details with condition: ${JSON.stringify(condition)}`,
        'error',
      );
      throw error;
    }
  }

  async removeConsumptionDetails(
    queryRunner: QueryRunner,
    condition: Condition,
  ) {
    this.logWithContext(
      `Removing consumption details with condition: ${JSON.stringify(condition)}`,
    );

    try {
      const result = await queryRunner.manager.delete(
        SuppliesConsumptionDetails,
        condition,
      );

      this.logWithContext(
        `Consumption details removed successfully, affected rows: ${result.affected}`,
      );

      return result;
    } catch (error) {
      this.logWithContext(
        `Failed to remove consumption details with condition: ${JSON.stringify(condition)}`,
        'error',
      );
      throw error;
    }
  }

  async updateConsumption(
    id: string,
    updateSuppliesConsumptionDto: ConsumptionSuppliesDto,
  ) {
    this.logWithContext(`Updating consumption with ID: ${id}`);

    try {
      const consumption: SuppliesConsumption =
        await this.findOneConsumption(id);

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

        this.logWithContext(
          `Consumption update operations - Create: ${toCreate.length}, Update: ${toUpdate.length}, Delete: ${toDelete.length}`,
        );

        for (const detailId of toDelete) {
          const oldRecordData: SuppliesConsumptionDetails = oldDetails.find(
            (record: SuppliesConsumptionDetails) => record.id === detailId,
          );

          if (oldRecordData.deletedDate !== null) {
            this.logWithContext(
              `Cannot delete consumption detail ${detailId} - linked to other records`,
              'warn',
            );
            throw new BadRequestException(
              `You cannot delete the record with id ${detailId}, it is linked to other records.`,
            );
          }

          await this.suppliesService.updateStock(queryRunner, {
            supplyId: oldRecordData.supply.id,
            amount: oldRecordData.amount,
            type_update: 'increment',
            inputUnit: oldRecordData.unit_of_measure,
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
            this.logWithContext(
              `Cannot update consumption detail ${detailId} - linked to other records`,
              'warn',
            );
            throw new BadRequestException(
              `You cannot update the record with id ${detailId} , it is linked to other records.`,
            );
          }

          const newRecordData = newDetails.find(
            (record) => record.id === detailId,
          );

          // Verificar que la unidad de medida sea válida
          if (
            !this.unitConversionService.isValidUnit(
              newRecordData.unit_of_measure,
            )
          ) {
            throw new BadRequestException(
              `Unidad de medida inválida: ${newRecordData.unit_of_measure}`,
            );
          }

          // Obtener el suministro para verificar su unidad de medida
          const supply = await this.suppliesService.findOne(
            newRecordData.supply.id,
          );

          // Verificar que las unidades sean del mismo tipo (masa o volumen)
          if (
            this.unitConversionService.getUnitType(
              newRecordData.unit_of_measure,
            ) !== this.unitConversionService.getUnitType(supply.unit_of_measure)
          ) {
            throw new BadRequestException(
              `No se puede convertir entre unidades de ${newRecordData.unit_of_measure} y ${supply.unit_of_measure}`,
            );
          }

          await this.suppliesService.updateStock(queryRunner, {
            supplyId: oldRecordData.supply.id,
            amount: oldRecordData.amount,
            type_update: 'increment',
            inputUnit: oldRecordData.unit_of_measure,
          });

          await this.suppliesService.updateStock(queryRunner, {
            supplyId: newRecordData.supply.id,
            amount: newRecordData.amount,
            type_update: 'decrement',
            inputUnit: newRecordData.unit_of_measure,
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

          // Verificar que la unidad de medida sea válida
          if (
            !this.unitConversionService.isValidUnit(
              newRecordData.unit_of_measure,
            )
          ) {
            throw new BadRequestException(
              `Unidad de medida inválida: ${newRecordData.unit_of_measure}`,
            );
          }

          // Obtener el suministro para verificar su unidad de medida
          const supply = await this.suppliesService.findOne(
            newRecordData.supply.id,
          );

          // Verificar que las unidades sean del mismo tipo (masa o volumen)
          if (
            this.unitConversionService.getUnitType(
              newRecordData.unit_of_measure,
            ) !== this.unitConversionService.getUnitType(supply.unit_of_measure)
          ) {
            throw new BadRequestException(
              `No se puede convertir entre unidades de ${newRecordData.unit_of_measure} y ${supply.unit_of_measure}`,
            );
          }

          await this.createConsumptionDetails(queryRunner, {
            consumption: id,
            ...newRecordData,
          });

          await this.suppliesService.updateStock(queryRunner, {
            supplyId: newRecordData.supply.id,
            amount: newRecordData.amount,
            type_update: 'decrement',
            inputUnit: newRecordData.unit_of_measure,
          });
        }

        const { details, ...rest } = updateSuppliesConsumptionDto;
        await queryRunner.manager.update(SuppliesConsumption, { id }, rest);

        await queryRunner.commitTransaction();

        this.logWithContext(`Consumption updated successfully with ID: ${id}`);

        return await this.findOneConsumption(id);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logWithContext(
        `Failed to update consumption with ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeConsumption(id: string) {
    this.logWithContext(`Attempting to remove consumption with ID: ${id}`);

    try {
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
            inputUnit: record.unit_of_measure,
          });
        }
        await queryRunner.manager.softRemove(consumptionSupply);

        await queryRunner.commitTransaction();
        this.logWithContext(`Consumption with ID: ${id} removed successfully`);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logWithContext(
        `Failed to remove consumption with ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async deleteAllConsumptionSupplies() {
    this.logWithContext(
      'Deleting ALL consumption supplies - this is a destructive operation',
      'warn',
    );

    try {
      await this.suppliesConsumptionRepository.delete({});
      this.logWithContext('All consumption supplies deleted successfully');
    } catch (error) {
      this.logWithContext('Failed to delete all consumption supplies', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulkConsumption(
    removeBulkConsumptionDto: RemoveBulkRecordsDto<SuppliesConsumption>,
  ) {
    this.logWithContext(
      `Starting bulk removal of ${removeBulkConsumptionDto.recordsIds.length} consumption records`,
    );

    try {
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

      this.logWithContext(
        `Bulk removal completed. Success: ${success.length}, Failed: ${failed.length}`,
      );

      return { success, failed };
    } catch (error) {
      this.logWithContext(
        'Failed to execute bulk removal of consumption records',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  private async getConsumptionData(
    year: number,
    cropId: string,
    supplyId: string,
  ) {
    this.logWithContext(
      `Getting consumption data for year: ${year}, crop: ${cropId || 'any'}, supply: ${supplyId || 'any'}`,
    );

    try {
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

      this.logWithContext(
        `Consumption data retrieved successfully for year: ${year}, ${rawData.length} months with data`,
      );

      return formatData;
    } catch (error) {
      this.logWithContext(
        `Failed to get consumption data for year: ${year}`,
        'error',
      );
      throw error;
    }
  }

  async findTotalConsumptionsInYearAndPreviousYear({
    year = new Date().getFullYear(),
    cropId = '',
    supplyId = '',
  }: QueryTotalConsumptionsInYearDto) {
    this.logWithContext(
      `Finding total consumptions in year: ${year} with crop: ${cropId || 'any'}, supply: ${supplyId || 'any'}`,
    );

    try {
      const previousYear = year - 1;

      const currentYearData = await this.getConsumptionData(
        year,
        cropId,
        supplyId,
      );
      const previousYearData = await this.getConsumptionData(
        previousYear,
        cropId,
        supplyId,
      );

      const consumptionDataByYear = [
        { year, data: currentYearData },
        { year: previousYear, data: previousYearData },
      ];

      this.logWithContext(
        `Total consumption data calculated successfully for year: ${year}`,
      );

      return {
        years: consumptionDataByYear,
      };
    } catch (error) {
      this.logWithContext(
        `Failed to find total consumptions in year: ${year}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }
}
