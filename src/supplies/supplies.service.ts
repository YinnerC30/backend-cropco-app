import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { QueryParams } from 'src/common/dto/QueryParams';

import { CreateSupplyDto } from './dto/create-supply.dto';

import { UpdateSupplyDto } from './dto/update-supply.dto';

import {
  DataSource,
  ILike,
  IsNull,
  MoreThan,
  Not,
  QueryRunner,
  Repository,
} from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';

import { Supply } from './entities/';

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';

import { SuppliesStock } from 'src/supplies/entities/supplies-stock.entity';
import { InsufficientSupplyStockException } from './exceptions/insufficient-supply-stock.exception';

@Injectable()
export class SuppliesService {
  private readonly logger = new Logger('SuppliesService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Supply)
    private readonly supplyRepository: Repository<Supply>,

    @InjectRepository(SuppliesStock)
    private readonly suppliesStockRepository: Repository<SuppliesStock>,
    private dataSource: DataSource,
  ) {}

  async create(createSupply: CreateSupplyDto) {
    try {
      const supply = this.supplyRepository.create(createSupply);
      await this.supplyRepository.save(supply);
      return supply;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(queryParams: QueryParams) {
    const {
      query: search = '',
      limit = 10,
      offset = 0,
      all_records = false,
    } = queryParams;

    let supplies;
    if (all_records) {
      supplies = await this.supplyRepository.find({
        where: [
          {
            name: ILike(`${search}%`),
          },
          {
            brand: ILike(`${search}%`),
          },
        ],
        relations: {
          stock: true,
        },
        order: {
          name: 'ASC',
        },
      });
    } else {
      supplies = await this.supplyRepository.find({
        where: [
          {
            name: ILike(`${search}%`),
          },
          {
            brand: ILike(`${search}%`),
          },
        ],
        relations: {
          stock: true,
        },
        order: {
          name: 'ASC',
        },
        take: limit,
        skip: offset * limit,
      });
    }

    let count: number;
    if (search.length === 0) {
      count = await this.supplyRepository.count();
    } else {
      count = supplies.length;
    }

    return {
      rowCount: count,
      rows: supplies,
      pageCount: Math.ceil(count / limit),
    };
  }

  async findAllSuppliesWithShopping() {
    const supplies = await this.supplyRepository.find({
      where: {
        shopping_details: MoreThan(0),
      },
      relations: {
        shopping_details: true,
      },
    });
    return {
      rowCount: supplies.length,
      rows: supplies,
    };
  }
  async findAllWithConsumptions() {
    const supplies = await this.supplyRepository.find({
      where: {
        consumption_details: MoreThan(0),
      },
      relations: {
        consumption_details: true,
      },
    });
    return {
      rowCount: supplies.length,
      rows: supplies,
    };
  }

  async findOne(id: string) {
    const supply = await this.supplyRepository.findOne({
      where: { id },
      relations: {
        stock: true,
        consumption_details: true,
        shopping_details: true,
      },
    });
    if (!supply) throw new NotFoundException(`Supply with id: ${id} not found`);
    return supply;
  }

  async update(id: string, updateSupplyDto: UpdateSupplyDto) {
    await this.findOne(id);
    await this.supplyRepository.update(id, updateSupplyDto);
  }

  async remove(id: string) {
    const supply = await this.findOne(id);

    if (supply.stock !== null && supply.stock.amount > 0) {
      throw new ConflictException('Supply has stock available');
    }

    await this.supplyRepository.softRemove(supply);
  }

  async deleteAllSupplies() {
    try {
      await this.supplyRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAllSuppliesStock(queryParams: QueryParams) {
    const { limit = 10, offset = 0, query: search = '' } = queryParams;

    const suppliesStock = await this.suppliesStockRepository.find({
      where: {
        supply: Not(IsNull()),
      },
      relations: {
        supply: true,
      },
      order: {
        amount: 'ASC',
      },
      take: limit,
      skip: offset,
    });

    let count: number;
    if (search.length === 0) {
      count = await this.supplyRepository.count();
    } else {
      count = suppliesStock.length;
    }

    return {
      rowCount: count,
      rows: suppliesStock.map((item: SuppliesStock) => {
        return {
          ...item.supply,
          amount: item.amount,
        };
      }),
      pageCount: Math.ceil(count / limit),
    };
  }

  async updateStock(
    queryRunner: QueryRunner,
    supplyId: any,
    amount: number,
    increment = true,
  ) {
    const supply = await this.supplyRepository.findOne({
      // withDeleted: true,
      where: { id: supplyId },
    });

    const recordSupplyStock = await queryRunner.manager
      .getRepository(SuppliesStock)
      .createQueryBuilder('supplyStock')
      .where('supplyStock.supplyId = :supplyId', { supplyId })
      .getOne();

    if (!recordSupplyStock) {
      const recordToSave = queryRunner.manager.create(SuppliesStock, {
        supply: supplyId,
        amount: 0,
      });

      await queryRunner.manager.save(SuppliesStock, recordToSave);
    }

    if (increment) {
      return await queryRunner.manager.increment(
        SuppliesStock,
        { supply: supplyId },
        'amount',
        amount,
      );
    }

    const amountActually = recordSupplyStock?.amount || 0;

    if (amountActually < amount) {
      throw new InsufficientSupplyStockException(amountActually, supply?.name);
    }

    await queryRunner.manager.decrement(
      SuppliesStock,
      { supply: supplyId },
      'amount',
      amount,
    );
  }

  async deleteAllStockSupplies() {
    try {
      await this.suppliesStockRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async removeBulk(removeBulkSuppliesDto: RemoveBulkRecordsDto<Supply>) {
    for (const { id } of removeBulkSuppliesDto.recordsIds) {
      await this.remove(id);
    }
  }
}
