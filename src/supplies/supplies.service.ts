import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { QueryParams } from 'src/common/dto/QueryParams';

import { CreateShoppingSuppliesDto } from './dto/create-shopping-supplies.dto';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { ShoppingSuppliesDetailsDto } from './dto/shopping-supplies-details.dto';
import { UpdateSuppliesShoppingDto } from './dto/update-supplies-shopping.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';

import {
  DataSource,
  ILike,
  IsNull,
  Not,
  QueryRunner,
  Repository
} from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';

import {
  SuppliesShopping,
  SuppliesShoppingDetails,

  Supply,
} from './entities/';

import { organizeIDsToUpdateEntity } from 'src/common/helpers/organizeIDsToUpdateEntity';

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';


import { QueryParamsShopping } from './dto/query-params-shopping.dto';

import { SuppliesStock } from 'src/supplies/entities/supplies-stock.entity';
import { InsufficientSupplyStockException } from './exceptions/insufficient-supply-stock.exception';
import { Condition } from './interfaces/condition.interface';

@Injectable()
export class SuppliesService {
  private readonly logger = new Logger('SuppliesService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Supply)
    private readonly supplyRepository: Repository<Supply>,
    @InjectRepository(SuppliesShopping)
    private readonly suppliesShoppingRepository: Repository<SuppliesShopping>,
    @InjectRepository(SuppliesShoppingDetails)
    private readonly suppliesShoppingDetailsRepository: Repository<SuppliesShoppingDetails>,
    // @InjectRepository(SuppliesConsumption)
    // private readonly suppliesConsumptionRepository: Repository<SuppliesConsumption>,
    // @InjectRepository(SuppliesConsumptionDetails)
    // private readonly suppliesConsumptionDetailsRepository: Repository<SuppliesConsumptionDetails>,
    @InjectRepository(SuppliesStock)
    private readonly suppliesStockRepository: Repository<SuppliesStock>,
    private dataSource: DataSource,
  ) { }

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
      allRecords = false,
    } = queryParams;

    let supplies;
    if (allRecords) {
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
    await this.supplyRepository.remove(supply);
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

  async createShoppingDetails(
    queryRunner: QueryRunner,
    object: ShoppingSuppliesDetailsDto,
  ) {
    const recordToSave = queryRunner.manager.create(
      SuppliesShoppingDetails,
      object,
    );
    await queryRunner.manager.save(SuppliesShoppingDetails, recordToSave);
  }

  async updateShoppingDetails(
    queryRunner: QueryRunner,
    condition: Condition,
    object: ShoppingSuppliesDetailsDto,
  ) {
    await queryRunner.manager.update(
      SuppliesShoppingDetails,
      condition,
      object,
    );
  }

  async removeShoppingDetails(queryRunner: QueryRunner, condition: Condition) {
    await queryRunner.manager.delete(SuppliesShoppingDetails, condition);
  }

  async createShopping(createShoppingSuppliesDto: CreateShoppingSuppliesDto) {
    // validateTotalInArray(createShoppingSuppliesDto);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { details, ...rest } = createShoppingSuppliesDto;

      let shoppingDetails: SuppliesShoppingDetails[] = [];

      for (const register of details) {
        shoppingDetails.push(
          queryRunner.manager.create(SuppliesShoppingDetails, register),
        );

        await this.updateStock(
          queryRunner,
          register.supply.id,
          register.amount,
          true,
        );
      }

      const shopping = queryRunner.manager.create(SuppliesShopping, {
        ...rest,
      });

      shopping.details = shoppingDetails;

      await queryRunner.manager.save(shopping);

      await queryRunner.commitTransaction();
      await queryRunner.release();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAllShopping(queryParams: QueryParamsShopping) {
    const {
      limit = 10,
      offset = 0,

      filter_by_date = false,
      type_filter_date,
      date,

      filter_by_total = false,
      type_filter_total,
      total,
    } = queryParams;

    const queryBuilder = this.suppliesShoppingRepository
      .createQueryBuilder('supplies_shopping')
      .orderBy('supplies_shopping.date', 'DESC')
      .take(limit)
      .skip(offset * limit);

    if (filter_by_date) {
      const operation = TypeFilterDate.AFTER == type_filter_date ? '>' : '<';
      queryBuilder.andWhere(`supplies_shopping.date ${operation} :date`, {
        date,
      });
    }

    if (filter_by_total) {
      const operation =
        TypeFilterNumber.MAX == type_filter_total
          ? '>'
          : TypeFilterNumber.EQUAL == type_filter_total
            ? '='
            : '<';
      queryBuilder.andWhere(`supplies_shopping.total ${operation} :total`, {
        total,
      });
    }

    const [shopping, count] = await queryBuilder.getManyAndCount();

    return {
      rowCount: count,
      rows: shopping,
      pageCount: Math.ceil(count / limit),
    };
  }

  async findOneShopping(id: string) {
    const supplyShopping = await this.suppliesShoppingRepository.findOne({
      where: { id },
      relations: {
        details: {
          supplier: true,
          supply: true,
        },
      },
    });
    if (!supplyShopping)
      throw new NotFoundException(`Supplies Shopping with id: ${id} not found`);
    return supplyShopping;
  }

  async updateShopping(
    id: string,
    updateSuppliesShoppingDto: UpdateSuppliesShoppingDto,
  ) {
    const shopping: any = await this.findOneShopping(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldDetails: SuppliesShoppingDetails[] = shopping.details;
      const newDetails: ShoppingSuppliesDetailsDto[] =
        updateSuppliesShoppingDto.details;

      const oldIDsShoppingDetails: string[] = oldDetails.map(
        (record: SuppliesShoppingDetails) => record.id,
      );
      const newIDsShoppingDetails: string[] = newDetails.map((record) =>
        new String(record.id).toString(),
      );

      const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
        newIDsShoppingDetails,
        oldIDsShoppingDetails,
      );

      for (const detailId of toDelete) {
        const oldRecordData: SuppliesShoppingDetails = oldDetails.find(
          (record: SuppliesShoppingDetails) => record.id === detailId,
        );

        await this.removeShoppingDetails(queryRunner, {
          id: detailId,
        });

        await this.updateStock(
          queryRunner,
          oldRecordData.supply.id,
          oldRecordData.amount,
          false,
        );
      }

      for (const detailId of toUpdate) {
        const oldRecordData = oldDetails.find(
          (record: SuppliesShoppingDetails) => record.id === detailId,
        );

        await this.updateStock(
          queryRunner,
          oldRecordData.supply.id,
          oldRecordData.amount,
          false,
        );

        const newRecordData = newDetails.find(
          (record) => record.id === detailId,
        );

        await this.updateStock(
          queryRunner,
          newRecordData.supply.id,
          newRecordData.amount,
          true,
        );

        await this.updateShoppingDetails(
          queryRunner,
          { id: detailId },
          { ...newRecordData },
        );
      }

      for (const detailId of toCreate) {
        const newRecordData = newDetails.find(
          (record) => record.id === detailId,
        );

        await this.createShoppingDetails(queryRunner, {
          shopping: id,
          ...newRecordData,
        });

        await this.updateStock(
          queryRunner,
          newRecordData.supply.id,
          newRecordData.amount,
          true,
        );
      }

      const { details, ...rest } = updateSuppliesShoppingDto;
      await queryRunner.manager.update(SuppliesShopping, { id }, rest);

      await queryRunner.commitTransaction();
    } catch (error) {
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async removeShopping(id: string) {
    const shoppingSupply: any = await this.findOneShopping(id);

    const { details } = shoppingSupply;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const record of details) {
        const { supply } = record;
        await this.updateStock(queryRunner, supply.id, record.amount, false);
      }
      await queryRunner.manager.remove(shoppingSupply);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAllShoppingSupplies() {
    try {
      await this.suppliesShoppingRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }













  async removeBulk(removeBulkSuppliesDto: RemoveBulkRecordsDto<Supply>) {
    for (const { id } of removeBulkSuppliesDto.recordsIds) {
      await this.remove(id);
    }
  }

  async removeBulkShopping(
    removeBulkShoppingDto: RemoveBulkRecordsDto<SuppliesShopping>,
  ) {
    for (const { id } of removeBulkShoppingDto.recordsIds) {
      await this.removeShopping(id);
    }
  }


}
