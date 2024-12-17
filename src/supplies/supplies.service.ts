import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { QueryParams } from 'src/common/dto/QueryParams';
import { CreateConsumptionSuppliesDto } from './dto/create-consumption-supplies.dto';
import { CreateShoppingSuppliesDto } from './dto/create-shopping-supplies.dto';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { ShoppingSuppliesDetailsDto } from './dto/shopping-supplies-details.dto';
import { UpdateSuppliesShoppingDto } from './dto/update-supplies-shopping.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';

import { DataSource, ILike, MoreThan, QueryRunner, Repository } from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';

import {
  SuppliesConsumption,
  SuppliesConsumptionDetails,
  SuppliesShopping,
  SuppliesShoppingDetails,
  SuppliesStock,
  Supply,
} from './entities/';

import { organizeIDsToUpdateEntity } from 'src/common/helpers/organizeIDsToUpdateEntity';

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { ConsumptionSuppliesDetailsDto } from './dto/consumption-supplies-details.dto';
import { QueryParamsConsumption } from './dto/query-params-consumption.dto';
import { QueryParamsShopping } from './dto/query-params-shopping.dto';
import { UpdateSuppliesConsumptionDto } from './dto/update-supplies-consumption.dto';
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
    @InjectRepository(SuppliesConsumption)
    private readonly suppliesConsumptionRepository: Repository<SuppliesConsumption>,
    @InjectRepository(SuppliesConsumptionDetails)
    private readonly suppliesConsumptionDetailsRepository: Repository<SuppliesConsumptionDetails>,
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
      search = '',
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
    const { limit = 10, offset = 0, search = '' } = queryParams;

    const suppliesStock = await this.suppliesStockRepository.find({
      relations: {
        supply: true,
      },
      where: {
        amount: MoreThan(0),
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

  async createConsumptionDetails(
    queryRunner: QueryRunner,
    object: ConsumptionSuppliesDetailsDto,
  ) {
    const recordToSave = queryRunner.manager.create(
      SuppliesConsumptionDetails,
      object,
    );
    await queryRunner.manager.save(SuppliesConsumptionDetails, recordToSave);
  }

  async updateConsumptionDetails(
    queryRunner: QueryRunner,
    condition: Condition,
    object: ConsumptionSuppliesDetailsDto,
  ) {
    await queryRunner.manager.update(
      SuppliesConsumptionDetails,
      condition,
      object,
    );
  }

  async removeConsumptionDetails(
    queryRunner: QueryRunner,
    condition: Condition,
  ) {
    await queryRunner.manager.delete(SuppliesConsumptionDetails, condition);
  }

  async createConsumption(
    createConsumptionSuppliesDto: CreateConsumptionSuppliesDto,
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
        await this.updateStock(queryRunner, item.supply.id, item.amount, false);
      }

      await queryRunner.commitTransaction();
      await queryRunner.release();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAllConsumptions(queryParams: QueryParamsConsumption) {
    const {
      limit = 10,
      offset = 0,
      search = '',
      filter_by_date = false,
      type_filter_date,
      date,
    } = queryParams;

    const queryBuilder = this.suppliesConsumptionRepository
      .createQueryBuilder('supplies_consumption')
      .orderBy('supplies_consumption.date', 'DESC')
      .take(limit)
      .skip(offset * limit);

    if (filter_by_date) {
      const operation = TypeFilterDate.AFTER == type_filter_date ? '>' : '<';
      queryBuilder.andWhere(`supplies_consumption.date ${operation} :date`, {
        date,
      });
    }

    const [consumptions, count] = await queryBuilder.getManyAndCount();

    return {
      rowCount: count,
      rows: consumptions,
      pageCount: Math.ceil(count / limit),
    };
  }

  async findOneConsumption(id: string) {
    const supplyConsumption = await this.suppliesConsumptionRepository.findOne({
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

  async updateConsumption(
    id: string,
    updateSuppliesConsumptionDto: UpdateSuppliesConsumptionDto,
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

        await this.removeConsumptionDetails(queryRunner, {
          id: detailId,
        });

        await this.updateStock(
          queryRunner,
          oldRecordData.supply.id,
          oldRecordData.amount,
          true,
        );
      }

      for (const detailId of toUpdate) {
        const oldRecordData: SuppliesConsumptionDetails = oldDetails.find(
          (record: SuppliesConsumptionDetails) => record.id === detailId,
        );

        await this.updateStock(
          queryRunner,
          oldRecordData.supply.id,
          oldRecordData.amount,
          true,
        );

        const newRecordData = newDetails.find(
          (record) => record.id === detailId,
        );

        await this.updateStock(
          queryRunner,
          newRecordData.supply.id,
          newRecordData.amount,
          false,
        );

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

        await this.updateStock(
          queryRunner,
          newRecordData.supply.id,
          newRecordData.amount,
          false,
        );
      }

      const { details, ...rest } = updateSuppliesConsumptionDto;
      await queryRunner.manager.update(SuppliesConsumption, { id }, rest);

      await queryRunner.commitTransaction();
      await queryRunner.release();
    } catch (error) {
      this.handleDBExceptions(error);
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
        await this.updateStock(
          queryRunner,
          record.supply.id,
          record.amount,
          true,
        );
      }
      await queryRunner.manager.remove(consumptionSupply);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAllConsumptionSupplies() {
    try {
      await this.suppliesConsumptionRepository.delete({});
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
