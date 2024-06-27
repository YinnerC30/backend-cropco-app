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
        console.log(item);
        console.log(item.crop.id, item.quantity, false);
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

  async findAll(queryParams: QueryParams) {
    const { limit = 10, offset = 0 } = queryParams;
    const sales = await this.saleRepository.find({
      order: {
        date: 'ASC',
      },
      take: limit,
      skip: offset,
    });

    let count: number = sales.length;

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
    // validateTotalInArray(updateSaleDto);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { details, ...rest } = updateSaleDto;

      const oldDetails: SaleDetails[] = sale.details;
      const newDetails: SaleDetailsDto[] = details;

      const oldIDsCrop: string[] = oldDetails.map((record) => record.crop.id);
      const newIDsCrop: string[] = newDetails.map((record) =>
        new String(record.crop.id).toString(),
      );

      const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
        newIDsCrop,
        oldIDsCrop,
      );

      for (const cropId of toDelete) {
        const oldData = oldDetails.find((record) => record.crop.id === cropId);
        await this.harvestService.updateStock(
          queryRunner,
          cropId,
          oldData.quantity,
          true,
        );
      }

      for (const cropId of toUpdate) {
        const oldData = oldDetails.find((record) => record.crop.id === cropId);
        await this.harvestService.updateStock(
          queryRunner,
          cropId,
          oldData.quantity,
          true,
        );

        const newData = newDetails.find((record) => record.crop.id === cropId);
        await this.harvestService.updateStock(
          queryRunner,
          cropId,
          newData.quantity,
          false,
        );
      }

      for (const cropId of toCreate) {
        const newData = newDetails.find((record) => record.crop.id === cropId);
        await this.harvestService.updateStock(
          queryRunner,
          cropId,
          newData.quantity,
          false,
        );
      }

      await queryRunner.manager.delete(SaleDetails, { sale: id });

      sale.details = [...toCreate, ...toUpdate].map((cropId) => {
        const data = newDetails.find((record) => record.crop.id === cropId);
        return queryRunner.manager.create(SaleDetails, data);
      });

      await queryRunner.manager.save(sale);
      await queryRunner.manager.update(Sale, { id }, rest);

      console.log(sale);

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
}
