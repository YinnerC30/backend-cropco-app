import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { Search } from 'src/common/dto/search.dto';
import { CreateConsumptionSuppliesDto } from './dto/create-consumption-supplies.dto';
import { CreatePurchaseSuppliesDto } from './dto/create-purchase-supplies.dto';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { PurchaseSuppliesDetailsDto } from './dto/purchase-supplies-details.dto';
import { UpdateSuppliesPurchaseDto } from './dto/update-supplies-purchase.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';

import { DataSource, Like, QueryRunner, Repository } from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';

import {
  SuppliesConsumption,
  SuppliesConsumptionDetails,
  SuppliesPurchase,
  SuppliesPurchaseDetails,
  SuppliesStock,
  Supply,
} from './entities/';

import { organizeIDsToUpdateEntity } from 'src/common/helpers/organizeIDsToUpdateEntity';

import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { validateTotalInArray } from 'src/common/helpers/validTotalInArray';
import { ConsumptionSuppliesDetailsDto } from './dto/consumption-supplies-details.dto';
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
    @InjectRepository(SuppliesPurchase)
    private readonly suppliesPurchaseRepository: Repository<SuppliesPurchase>,
    @InjectRepository(SuppliesPurchaseDetails)
    private readonly suppliesPurchaseDetailsRepository: Repository<SuppliesPurchaseDetails>,
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

  async findAll(search: Search) {
    const { parameter = '', limit = 10, offset = 0 } = search;

    const supplies = await this.supplyRepository.find({
      where: [
        {
          name: Like(`${parameter}%`),
        },
        {
          brand: Like(`${parameter}%`),
        },
      ],
      order: {
        name: 'ASC',
      },
      take: limit,
      skip: offset * limit,
    });

    let count: number;
    if (parameter.length === 0) {
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
        purchase_details: true,
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

  async findAllSuppliesStock(search: Search) {
    const { limit = 10, offset = 0 } = search;

    return this.suppliesStockRepository.find({
      order: {
        amount: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async updateStock(
    queryRunner: QueryRunner,
    supplyId: any,
    amount: number,
    increment = true,
  ) {
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

    const amountActually = recordSupplyStock.amount;

    if (amountActually < amount) {
      throw new InsufficientSupplyStockException();
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

  async createPurchaseDetails(
    queryRunner: QueryRunner,
    object: PurchaseSuppliesDetailsDto,
  ) {
    const recordToSave = queryRunner.manager.create(
      SuppliesPurchaseDetails,
      object,
    );
    await queryRunner.manager.save(SuppliesPurchaseDetails, recordToSave);
  }

  async updatePurchaseDetails(
    queryRunner: QueryRunner,
    condition: Condition,
    object: PurchaseSuppliesDetailsDto,
  ) {
    await queryRunner.manager.update(
      SuppliesPurchaseDetails,
      condition,
      object,
    );
  }

  async removePurchaseDetails(queryRunner: QueryRunner, condition: Condition) {
    await queryRunner.manager.delete(SuppliesPurchaseDetails, condition);
  }

  async createPurchase(createPurchaseSuppliesDto: CreatePurchaseSuppliesDto) {
    validateTotalInArray(createPurchaseSuppliesDto);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { details, ...rest } = createPurchaseSuppliesDto;

      let purchaseDetails: SuppliesPurchaseDetails[] = [];

      for (const register of details) {
        purchaseDetails.push(
          queryRunner.manager.create(SuppliesPurchaseDetails, register),
        );

        await this.updateStock(
          queryRunner,
          register.supply,
          register.amount,
          true,
        );
      }

      const purchase = queryRunner.manager.create(SuppliesPurchase, {
        ...rest,
      });

      purchase.details = purchaseDetails;

      await queryRunner.manager.save(purchase);

      await queryRunner.commitTransaction();
      await queryRunner.release();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAllPurchases(search: Search) {
    const { limit = 10, offset = 0 } = search;

    return this.suppliesPurchaseRepository.find({
      order: {
        date: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findOnePurchase(id: string) {
    const supplyPurchase = await this.suppliesPurchaseRepository.findOne({
      where: { id },
      relations: {
        details: true,
      },
    });
    if (!supplyPurchase)
      throw new NotFoundException(`Supplies Purchase with id: ${id} not found`);
    return supplyPurchase;
  }

  async updatePurchase(
    id: string,
    updateSuppliesPurchaseDto: UpdateSuppliesPurchaseDto,
  ) {
    validateTotalInArray(updateSuppliesPurchaseDto);

    const purchase: SuppliesPurchase = await this.findOnePurchase(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldDetails: SuppliesPurchaseDetails[] = purchase.details;
      const newDetails: PurchaseSuppliesDetailsDto[] =
        updateSuppliesPurchaseDto.details;

      const oldIDsSupplies: string[] = oldDetails.map(
        (record: SuppliesPurchaseDetails) => record.supply.id,
      );
      const newIDsSupplies: string[] = newDetails.map((record) =>
        new String(record.supply).toString(),
      );

      const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
        newIDsSupplies,
        oldIDsSupplies,
      );

      for (const supply of toDelete) {
        const oldRecordData: SuppliesPurchaseDetails = oldDetails.find(
          (record: SuppliesPurchaseDetails) => record.supply.id === supply,
        );

        await this.removePurchaseDetails(queryRunner, {
          purchase: id,
          supply,
        });

        await this.updateStock(
          queryRunner,
          supply,
          oldRecordData.amount,
          false,
        );
      }

      for (const supply of toUpdate) {
        const oldRecordData = oldDetails.find(
          (record: SuppliesPurchaseDetails) => record.supply.id === supply,
        );

        await this.updateStock(
          queryRunner,
          supply,
          oldRecordData.amount,
          false,
        );

        const newRecordData = newDetails.find(
          (record) => record.supply === supply,
        );

        await this.updateStock(queryRunner, supply, newRecordData.amount, true);

        await this.updatePurchaseDetails(
          queryRunner,
          { purchase: id, supply },
          { ...newRecordData },
        );
      }

      for (const supply of toCreate) {
        const newRecordData = newDetails.find(
          (record) => record.supply === supply,
        );

        await this.createPurchaseDetails(queryRunner, {
          purchase: id,
          ...newRecordData,
        });

        await this.updateStock(queryRunner, supply, newRecordData.amount, true);
      }

      const { details, ...rest } = updateSuppliesPurchaseDto;
      await queryRunner.manager.update(SuppliesPurchase, { id }, rest);

      await queryRunner.commitTransaction();
    } catch (error) {
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async removePurchase(id: string) {
    const purchaseSupply: SuppliesPurchase = await this.findOnePurchase(id);

    const { details } = purchaseSupply;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const record of details) {
        const { supply } = record;
        await this.updateStock(queryRunner, supply.id, record.amount, false);
      }
      await queryRunner.manager.remove(purchaseSupply);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAllPurchaseSupplies() {
    try {
      await this.suppliesPurchaseRepository.delete({});
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
        await this.updateStock(queryRunner, item.supply, item.amount, false);
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

  async findAllConsumptions(search: Search) {
    const { limit = 10, offset = 0 } = search;

    return this.suppliesConsumptionRepository.find({
      order: {
        date: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findOneConsumption(id: string) {
    const supplyConsumption = await this.suppliesConsumptionRepository.findOne({
      where: { id },
      relations: {
        details: true,
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

      const oldIDsSupplies: string[] = oldDetails.map(
        (record: SuppliesConsumptionDetails) => record.supply.id,
      );
      const newIDsSupplies: string[] = newDetails.map((record) =>
        new String(record.supply).toString(),
      );

      const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
        newIDsSupplies,
        oldIDsSupplies,
      );

      for (const supply of toDelete) {
        const oldRecordData: SuppliesConsumptionDetails = oldDetails.find(
          (record: SuppliesConsumptionDetails) => record.supply.id === supply,
        );

        await this.removeConsumptionDetails(queryRunner, {
          consumption: id,
          supply,
        });

        await this.updateStock(queryRunner, supply, oldRecordData.amount, true);
      }

      for (const supply of toUpdate) {
        const oldRecordData: SuppliesConsumptionDetails = oldDetails.find(
          (record: SuppliesConsumptionDetails) => record.supply.id === supply,
        );

        await this.updateStock(queryRunner, supply, oldRecordData.amount, true);

        const newRecordData = newDetails.find(
          (record) => record.supply === supply,
        );

        await this.updateStock(
          queryRunner,
          supply,
          newRecordData.amount,
          false,
        );

        await this.updateConsumptionDetails(
          queryRunner,
          { consumption: id, supply },
          { ...newRecordData },
        );
      }

      for (const supply of toCreate) {
        const newRecordData = newDetails.find(
          (record) => record.supply === supply,
        );

        await this.createConsumptionDetails(queryRunner, {
          consumption: id,
          ...newRecordData,
        });

        await this.updateStock(
          queryRunner,
          supply,
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
}
