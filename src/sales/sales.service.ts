import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryParams } from 'src/common/dto/QueryParams';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { organizeIDsToUpdateEntity } from 'src/common/helpers/organizeIDsToUpdateEntity';
import { validateTotalInArray } from 'src/common/helpers/validTotalInArray';
import { HarvestService } from 'src/harvest/harvest.service';
import { DataSource, Repository } from 'typeorm';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleDetailsDto } from './dto/sale-details.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SaleDetails } from './entities/sale-details.entity';
import { Sale } from './entities/sale.entity';
import { QueryParamsSale } from './dto/query-params-sale.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';

@Injectable()
export class SalesService {
  private readonly logger = new Logger('SalesService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly dataSource: DataSource,
    private readonly harvestService: HarvestService,
  ) {}

  async create(createSaleDto: CreateSaleDto) {
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
        await this.harvestService.updateStock(
          queryRunner,
          item.crop.id,
          item.quantity,
          false,
        );
      }

      await queryRunner.manager.save(sale);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
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

      filter_by_total = false,
      type_filter_total,
      total,

      filter_by_quantity = false,
      type_filter_quantity,
      quantity,

      filter_by_is_receivable = false,
      is_receivable,
    } = queryParams;

    const queryBuilder = this.saleRepository
      .createQueryBuilder('sale')
      .orderBy('sale.date', 'DESC')
      .take(limit)
      .skip(offset * limit);

    if (filter_by_date) {
      const operation = TypeFilterDate.AFTER == type_filter_date ? '>' : '<';
      queryBuilder.andWhere(`sale.date ${operation} :date`, { date });
    }

    if (filter_by_total) {
      const operation =
        TypeFilterNumber.MAX == type_filter_total
          ? '>'
          : TypeFilterNumber.EQUAL == type_filter_total
            ? '='
            : '<';
      queryBuilder.andWhere(`sale.total ${operation} :total`, { total });
    }
    if (filter_by_quantity) {
      const operation =
        TypeFilterNumber.MAX == type_filter_quantity
          ? '>'
          : TypeFilterNumber.EQUAL == type_filter_quantity
            ? '='
            : '<';
      queryBuilder.andWhere(`sale.quantity ${operation} :quantity`, {
        quantity,
      });
    }
    if (filter_by_is_receivable) {
      queryBuilder.andWhere(`sale.is_receivable = :is_receivable`, {
        is_receivable,
      });
    }

    const [sales, count] = await queryBuilder.getManyAndCount();

    return {
      rowCount: count,
      rows: sales,
      pageCount: Math.ceil(count / limit),
    };
  }

  async findOne(id: string) {
    const sale = await this.saleRepository.findOne({
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

  async update(id: string, updateSaleDto: UpdateSaleDto) {
    const sale: Sale = await this.findOne(id);

    validateTotalInArray(updateSaleDto, {
      propertyNameArray: 'details',
      namesPropertiesToSum: ['total'],
    });

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

      // FIX: Se envia varias veces el crop.id, hay que tomar en cuenta el ID del registro mejor
      const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
        newIDsHarvestDetails,
        oldIDsHarvestDetails,
      );

      for (const harvestDetailId of toDelete) {
        const oldData = oldDetails.find(
          (record) => record.id === harvestDetailId,
        );
        await this.harvestService.updateStock(
          queryRunner,
          oldData.crop.id,
          oldData.quantity,
          true,
        );
      }

      for (const harvestDetailId of toUpdate) {
        const oldData = oldDetails.find(
          (record) => record.id === harvestDetailId,
        );

        await this.harvestService.updateStock(
          queryRunner,
          oldData.crop.id,
          oldData.quantity,
          true,
        );

        const newData = newDetails.find(
          (record) => record.id === harvestDetailId,
        );

        await this.harvestService.updateStock(
          queryRunner,
          newData.crop.id,
          newData.quantity,
          false,
        );
      }

      for (const harvestDetailId of toCreate) {
        const newData = newDetails.find(
          (record) => record.id === harvestDetailId,
        );
        await this.harvestService.updateStock(
          queryRunner,
          newData.crop.id,
          newData.quantity,
          false,
        );
      }

      await queryRunner.manager.delete(SaleDetails, { sale: id });

      sale.details = [...toCreate, ...toUpdate].map((harvestDetailId) => {
        const data = newDetails.find((record) => record.id === harvestDetailId);
        return queryRunner.manager.create(SaleDetails, data);
      });

      await queryRunner.manager.save(sale);
      await queryRunner.manager.update(Sale, { id }, rest);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
    }
  }

  async remove(id: string) {
    const sale = await this.findOne(id);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { details } = sale;
      for (const item of details) {
        await this.harvestService.updateStock(
          queryRunner,
          item.crop.id,
          item.quantity,
          true,
        );
      }

      await queryRunner.manager.remove(Sale, sale);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAllSales() {
    try {
      await this.saleRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async removeBulk(removeBulkSalesDto: RemoveBulkRecordsDto<Sale>) {
    for (const { id } of removeBulkSalesDto.recordsIds) {
      await this.remove(id);
    }
  }
}
