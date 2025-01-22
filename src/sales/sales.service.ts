import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { organizeIDsToUpdateEntity } from 'src/common/helpers/organizeIDsToUpdateEntity';
import { validateTotalInArray } from 'src/common/helpers/validTotalInArray';
import { HarvestService } from 'src/harvest/harvest.service';
import { DataSource, Repository } from 'typeorm';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QueryParamsSale } from './dto/query-params-sale.dto';
import { SaleDetailsDto } from './dto/sale-details.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SaleDetails } from './entities/sale-details.entity';
import { Sale } from './entities/sale.entity';

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
      .withDeleted()
      .leftJoinAndSelect('sale.details', 'details')
      .leftJoinAndSelect('details.client', 'client')
      .leftJoinAndSelect('details.crop', 'crop')
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

      const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
        newIDsHarvestDetails,
        oldIDsHarvestDetails,
      );

      for (const saleDetailId of toDelete) {
        const oldData = oldDetails.find((record) => record.id === saleDetailId);

        if (oldData.deletedDate !== null) {
          throw new BadRequestException(
            'You cannot delete this record, it is linked to other records.',
          );
        }

        await this.harvestService.updateStock(
          queryRunner,
          oldData.crop.id,
          oldData.quantity,
          true,
        );

        await queryRunner.manager.delete(SaleDetails, { id: saleDetailId });
      }

      for (const saleDetailId of toUpdate) {
        const oldData = oldDetails.find((record) => record.id === saleDetailId);

        if (oldData.deletedDate !== null) {
          continue;
        }

        await this.harvestService.updateStock(
          queryRunner,
          oldData.crop.id,
          oldData.quantity,
          true,
        );

        const newData = newDetails.find((record) => record.id === saleDetailId);

        await this.harvestService.updateStock(
          queryRunner,
          newData.crop.id,
          newData.quantity,
          false,
        );

        await queryRunner.manager.update(
          SaleDetails,
          { id: saleDetailId },
          newData,
        );
      }

      for (const saleDetailId of toCreate) {
        const newData = newDetails.find((record) => record.id === saleDetailId);
        console.log(newData);
        await this.harvestService.updateStock(
          queryRunner,
          newData.crop.id,
          newData.quantity,
          false,
        );
        const record = queryRunner.manager.create(SaleDetails, {
          sale: sale.id,
          ...newData,
        });
        await queryRunner.manager.save(record);
      }

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
        if (item.crop.deletedDate !== null) {
          continue;
        }

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
