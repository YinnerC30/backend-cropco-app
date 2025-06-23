import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { organizeIDsToUpdateEntity } from 'src/common/helpers/organize-ids-to-update-entity';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { monthNamesES } from 'src/common/utils/monthNamesEs';
import { HarvestService } from 'src/harvest/harvest.service';
import { PrinterService } from 'src/printer/printer.service';
import { DataSource, Repository } from 'typeorm';
import { QueryParamsSale } from './dto/query-params-sale.dto';
import { QueryTotalSalesInYearDto } from './dto/query-total-sales-year';
import { SaleDetailsDto } from './dto/sale-details.dto';
import { SaleDto } from './dto/sale.dto';
import { SaleDetails } from './entities/sale-details.entity';
import { Sale } from './entities/sale.entity';
import { getSaleReport } from './reports/get-sale';
import { getComparisonOperator } from 'src/common/helpers/get-comparison-operator';
import { UnitConversionService } from 'src/common/unit-conversion/unit-conversion.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class SalesService {
  private readonly logger = new Logger('SalesService');

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly dataSource: DataSource,
    private readonly harvestService: HarvestService,
    private readonly printerService: PrinterService,
    private readonly handlerError: HandlerErrorService,
    private readonly unitConversionService: UnitConversionService,
  ) {
    this.saleRepository = this.request['tenantConnection'].getRepository(Sale);
    this.dataSource = this.request['tenantConnection'];
  }

  async create(createSaleDto: SaleDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { details, ...rest } = createSaleDto;
      const sale = queryRunner.manager.create(Sale, rest);

      sale.details = details.map((saleDetails: SaleDetailsDto) => {
        return queryRunner.manager.create(SaleDetails, saleDetails);
      });

      for (const item of details) {
        const amountConverted = this.unitConversionService.convert(
          item.amount,
          item.unit_of_measure,
          'GRAMOS',
        );

        await this.harvestService.updateStock(queryRunner, {
          cropId: item.crop.id,
          amount: amountConverted,
          type_update: 'decrement',
        });
      }

      const totalAmountInGrams = details.reduce((total, detail) => {
        const amountInGrams = this.unitConversionService.convert(
          detail.amount,
          detail.unit_of_measure,
          'GRAMOS',
        );
        return total + amountInGrams;
      }, 0);

      sale.amount = totalAmountInGrams;

      await queryRunner.manager.save(sale);

      await queryRunner.commitTransaction();
      return sale;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(queryParams: QueryParamsSale) {
    const {
      limit = 10,
      offset = 0,

      filter_by_date = false,
      type_filter_date,
      date,

      filter_by_value_pay = false,
      type_filter_value_pay,
      value_pay,

      filter_by_amount = false,
      type_filter_amount,
      type_unit_of_measure = 'KILOGRAMOS',
      amount,

      filter_by_is_receivable = false,
      is_receivable,

      clients = [],
      crops = [],
    } = queryParams;

    const queryBuilder = this.saleRepository
      .createQueryBuilder('sale')
      .withDeleted()
      .leftJoinAndSelect('sale.details', 'details')
      .leftJoinAndSelect('details.client', 'client')
      .leftJoinAndSelect('details.crop', 'crop')
      .orderBy('sale.date', 'DESC')
      .take(limit)
      .skip(offset * limit);

    filter_by_date &&
      queryBuilder.andWhere(
        `sale.date ${getComparisonOperator(type_filter_date)} :date`,
        { date },
      );

    const amountConverted = this.unitConversionService.convert(
      amount,
      type_unit_of_measure,
      'GRAMOS',
    );

    filter_by_amount &&
      queryBuilder.andWhere(
        `sale.amount ${getComparisonOperator(type_filter_amount)} :amount`,
        { amount: amountConverted },
      );

    filter_by_value_pay &&
      queryBuilder.andWhere(
        `sale.value_pay ${getComparisonOperator(type_filter_value_pay)} :value_pay`,
        {
          value_pay,
        },
      );

    clients.length > 0 &&
      queryBuilder.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('sale.id')
          .from('sales', 'sale')
          .leftJoin('sale.details', 'details')
          .leftJoin('details.client', 'client')
          .where('client.id IN (:...clients)', { clients })
          .getQuery();
        return 'sale.id IN ' + subQuery;
      });

    crops.length > 0 &&
      queryBuilder.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('sale.id')
          .from('sales', 'sale')
          .leftJoin('sale.details', 'details')
          .leftJoin('details.crop', 'crop')
          .where('crop.id IN (:...crops)', { crops })
          .getQuery();
        return 'sale.id IN ' + subQuery;
      });

    filter_by_is_receivable &&
      queryBuilder.andWhere(`sale.is_receivable = :is_receivable`, {
        is_receivable,
      });

    const [sales, count] = await queryBuilder.getManyAndCount();

    if (sales.length === 0 && count > 0) {
      throw new NotFoundException(
        'There are no sale records with the requested pagination',
      );
    }

    return {
      total_row_count: count,
      current_row_count: sales.length,
      total_page_count: Math.ceil(count / limit),
      current_page_count: sales.length > 0 ? offset + 1 : 0,
      records: sales,
    };
  }

  async findOne(id: string) {
    const sale = await this.saleRepository.findOne({
      withDeleted: true,
      where: {
        id,
      },
      relations: {
        details: {
          client: true,
          crop: true,
        },
      },
    });
    if (!sale) throw new NotFoundException(`Sale with id: ${id} not found`);
    return sale;
  }

  async update(id: string, updateSaleDto: SaleDto) {
    const sale: Sale = await this.findOne(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { details, ...rest } = updateSaleDto;

      const oldDetails: SaleDetails[] = sale.details;
      const newDetails: SaleDetailsDto[] = details;

      const oldIDsHarvestDetails: string[] = oldDetails.map(
        (record) => record.id,
      );
      const newIDsHarvestDetails: string[] = newDetails.map((record) =>
        new String(record.id).toString(),
      );

      const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
        newIDsHarvestDetails,
        oldIDsHarvestDetails,
      );

      for (const saleDetailId of toDelete) {
        const oldData = oldDetails.find((record) => record.id === saleDetailId);

        // if (oldData.is_receivable === true) {
        //   throw new BadRequestException(
        //     `You cannot delete the record with id ${saleDetailId} , it is unpaid sale.`,
        //   );
        // }

        if (oldData.deletedDate !== null) {
          throw new BadRequestException(
            `You cannot delete the record with id ${saleDetailId} , it is linked to other records.`,
          );
        }

        const amountConverted = this.unitConversionService.convert(
          oldData.amount,
          oldData.unit_of_measure,
          'GRAMOS',
        );

        await this.harvestService.updateStock(queryRunner, {
          cropId: oldData.crop.id,
          amount: amountConverted,
          type_update: 'increment',
        });

        await queryRunner.manager.delete(SaleDetails, { id: saleDetailId });
      }

      for (const saleDetailId of toUpdate) {
        const oldRecordData = oldDetails.find(
          (record) => record.id === saleDetailId,
        );
        const dataRecordNew = newDetails.find(
          (record) => record.id === saleDetailId,
        );

        const valuesAreDifferent =
          dataRecordNew.value_pay !== oldRecordData.value_pay ||
          dataRecordNew.amount !== oldRecordData.amount;

        if (valuesAreDifferent && oldRecordData.deletedDate !== null) {
          throw new BadRequestException(
            `You cannot update the record with id ${saleDetailId} , it is linked to other records.`,
          );
        }

        const amountConverted = this.unitConversionService.convert(
          oldRecordData.amount,
          oldRecordData.unit_of_measure,
          'GRAMOS',
        );

        await this.harvestService.updateStock(queryRunner, {
          cropId: oldRecordData.crop.id,
          amount: amountConverted,
          type_update: 'increment',
        });

        const amountConvertedNew = this.unitConversionService.convert(
          dataRecordNew.amount,
          dataRecordNew.unit_of_measure,
          'GRAMOS',
        );

        await this.harvestService.updateStock(queryRunner, {
          cropId: dataRecordNew.crop.id,
          amount: amountConvertedNew,
          type_update: 'decrement',
        });

        await queryRunner.manager.update(
          SaleDetails,
          { id: saleDetailId },
          dataRecordNew,
        );
      }

      for (const saleDetailId of toCreate) {
        const newData = newDetails.find((record) => record.id === saleDetailId);

        const amountConverted = this.unitConversionService.convert(
          newData.amount,
          newData.unit_of_measure,
          'GRAMOS',
        );

        await this.harvestService.updateStock(queryRunner, {
          cropId: newData.crop.id,
          amount: amountConverted,
          type_update: 'decrement',
        });
        const record = queryRunner.manager.create(SaleDetails, {
          sale: { id: sale.id },
          ...newData,
        });
        await queryRunner.manager.save(record);
      }

      const totalAmountInGrams = newDetails.reduce((total, detail) => {
        const amountInGrams = this.unitConversionService.convert(
          detail.amount,
          detail.unit_of_measure,
          'GRAMOS',
        );
        return total + amountInGrams;
      }, 0);

      await queryRunner.manager.update(
        Sale,
        { id },
        { ...rest, amount: totalAmountInGrams },
      );

      await queryRunner.commitTransaction();
      return await this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
    } finally {
    }
  }

  async remove(id: string) {
    const sale = await this.findOne(id);

    if (sale.details.some((item) => item.is_receivable === true)) {
      throw new ConflictException(
        `The record with id ${sale.id} cannot be deleted because it has unpaid sales`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { details } = sale;
      for (const item of details) {
        if (item.crop.deletedDate !== null) {
          continue;
        }

        const amountConverted = this.unitConversionService.convert(
          item.amount,
          item.unit_of_measure,
          'GRAMOS',
        );

        await this.harvestService.updateStock(queryRunner, {
          cropId: item.crop.id,
          amount: amountConverted,
          type_update: 'increment',
        });
      }

      await queryRunner.manager.remove(Sale, sale);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAllSales() {
    try {
      await this.saleRepository.delete({});
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulk(removeBulkSalesDto: RemoveBulkRecordsDto<Sale>) {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const { id } of removeBulkSalesDto.recordsIds) {
      try {
        await this.remove(id);
        success.push(id);
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }

    return { success, failed };
  }

  async exportSaleToPDF(id: string, subdomain: string) {
    const sale = await this.findOne(id);

    const docDefinition = getSaleReport({ data: sale, subdomain });

    return this.printerService.createPdf({ docDefinition });
  }

  async findTotalSalesInYear({
    year = new Date().getFullYear(),
    cropId = '',
    clientId = '',
  }: QueryTotalSalesInYearDto) {
    const previousYear = year - 1;

    const getHarvestData = async (
      year: number,
      cropId: string,
      clientId: string,
    ) => {
      const queryBuilder = this.saleRepository
        .createQueryBuilder('sale')
        .leftJoin('sale.details', 'details')
        .leftJoin('details.crop', 'crop')
        .leftJoin('details.client', 'client')
        .select([
          'CAST(EXTRACT(MONTH FROM sale.date) AS INTEGER) as month',
          'CAST(SUM(DISTINCT details.value_pay) AS INTEGER) as value_pay',
          'CAST(SUM(DISTINCT details.amount) AS INTEGER) as amount',
        ])
        .where('EXTRACT(YEAR FROM sale.date) = :year', { year })
        .groupBy('EXTRACT(MONTH FROM sale.date)')
        .orderBy('month', 'ASC');

      if (cropId) {
        queryBuilder.andWhere('crop.id = :cropId', { cropId });
      }
      if (clientId) {
        queryBuilder.andWhere('client.id = :clientId', { clientId });
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
              value_pay: 0,
              amount: 0,
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

    const currentYearData = await getHarvestData(year, cropId, clientId);
    const previousYearData = await getHarvestData(
      previousYear,
      cropId,
      clientId,
    );

    const saleDataByYear = [
      { year, data: currentYearData },
      { year: previousYear, data: previousYearData },
    ];

    return {
      years: saleDataByYear,
    };
  }
}
