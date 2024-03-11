import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateConsumptionSuppliesDto } from './dto/create-consumption-supplies.dto';
import { CreatePurchaseSuppliesDto } from './dto/create-purchase-supplies.dto';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { PurchaseSuppliesDetailsDto } from './dto/purchase-supplies-details.dto';
import { UpdateSuppliesPurchaseDto } from './dto/update-supplies-purchase.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';

import { DataSource, QueryRunner, Repository } from 'typeorm';

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

import { validateTotalPurchase } from './helpers/validateTotalPurchase';

import { Condition } from './interfaces/condition.interface';
import { ConsumptionSuppliesDetailsDto } from './dto/consumption-supplies-details.dto';
import { UpdateSuppliesConsumptionDto } from './dto/update-supplies-consumption.dto';
import { InsufficientSupplyStockException } from './exceptions/insufficient-supply-stock.exception';

@Injectable()
export class SuppliesService {
  private readonly logger = new Logger('SuppliesService');
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

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    return this.supplyRepository.find({
      order: {
        name: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    const supply = await this.supplyRepository.findOneBy({ id });
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
    const supply = this.supplyRepository.createQueryBuilder('supply');
    try {
      await supply.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  // Methods SuppliesStock

  async findAllSuppliesStock(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

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
    const suppliesStock =
      this.suppliesStockRepository.createQueryBuilder('suppliesStock');
    try {
      await suppliesStock.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  // Methods purchase details

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

  // Methods purchase supplies

  async createPurchase(createPurchaseSuppliesDto: CreatePurchaseSuppliesDto) {
    // Crear e iniciar la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    validateTotalPurchase(createPurchaseSuppliesDto);

    try {
      const { details, ...rest } = createPurchaseSuppliesDto;

      // Crear objetos detalles de compra

      let purchaseDetails: SuppliesPurchaseDetails[] = [];

      for (const register of details) {
        purchaseDetails.push(
          queryRunner.manager.create(SuppliesPurchaseDetails, register),
        );

        // Agregar insumo al stock

        await this.updateStock(
          queryRunner,
          register.supply,
          register.amount,
          true,
        );
      }

      // Guardar compra
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

  async findAllPurchases(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

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
    });
    if (!supplyPurchase)
      throw new NotFoundException(`Supplies Purchase with id: ${id} not found`);
    return supplyPurchase;
  }

  async updatePurchase(
    id: string,
    updateSuppliesPurchaseDto: UpdateSuppliesPurchaseDto,
  ) {
    const purchase: SuppliesPurchase = await this.findOnePurchase(id);

    validateTotalPurchase(updateSuppliesPurchaseDto);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Obtener ids supplies old record
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

      // Delete
      for (const supply of toDelete) {
        const oldRecordData: SuppliesPurchaseDetails = oldDetails.find(
          (record: SuppliesPurchaseDetails) => record.supply.id === supply,
        );

        await this.removePurchaseDetails(queryRunner, {
          purchase: id,
          supply,
        });

        // Validar que los valores sean distintos para realizar la actualización

        await this.updateStock(
          queryRunner,
          supply,
          oldRecordData.amount,
          false,
        );
      }

      // Update
      for (const supply of toUpdate) {
        const oldRecordData = oldDetails.find(
          (record: SuppliesPurchaseDetails) => record.supply.id === supply,
        );

        // Decrement antiguo valor

        await this.updateStock(
          queryRunner,
          supply,
          oldRecordData.amount,
          false,
        );

        // Increment nuevo valor
        const newRecordData = newDetails.find(
          (record) => record.supply === supply,
        );

        await this.updateStock(queryRunner, supply, newRecordData.amount, true);

        // Update register

        await this.updatePurchaseDetails(
          queryRunner,
          { purchase: id, supply },
          { ...newRecordData },
        );
      }

      // Create
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
      await queryRunner.release();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async removePurchase(id: string) {
    const purchaseSupply: SuppliesPurchase = await this.findOnePurchase(id);

    const { details } = purchaseSupply;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Decrement stock
      for (const record of details) {
        const { supply } = record;
        await this.updateStock(queryRunner, supply.id, record.amount, false);
      }
      // Delete Purchase
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
    const purchase =
      this.suppliesPurchaseRepository.createQueryBuilder('purchase');
    const purchaseDetails =
      this.suppliesPurchaseDetailsRepository.createQueryBuilder(
        'purchaseDetails',
      );

    try {
      await purchaseDetails.delete().where({}).execute();
      await purchase.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  // Methods to consumption Supplies Details

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
    object: UpdateSuppliesConsumptionDto | any, // TODO: Remover any
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

  // Methods to consumption Supplies

  async createConsumption(
    createConsumptionSuppliesDto: CreateConsumptionSuppliesDto,
  ) {
    // Crear e iniciar la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { details, ...rest } = createConsumptionSuppliesDto;

      // Crear objetos de detalle de consumo
      let consumptionDetails: SuppliesConsumptionDetails[] = [];

      for (const register of details) {
        consumptionDetails.push(
          queryRunner.manager.create(SuppliesConsumptionDetails, {
            ...register,
          }),
        );
      }
      // Guardar consumo
      const consumption = queryRunner.manager.create(SuppliesConsumption, {
        ...rest,
      });

      consumption.details = consumptionDetails;

      await queryRunner.manager.save(consumption);

      // Agregar insumo al stock de

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

  async findAllConsumptions(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

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
      // Obtener ids supplies old record
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

      // Delete
      for (const supply of toDelete) {
        const oldRecordData: SuppliesConsumptionDetails = oldDetails.find(
          (record: SuppliesConsumptionDetails) => record.supply.id === supply,
        );

        await this.removeConsumptionDetails(queryRunner, {
          consumption: id,
          supply,
        });

        // Validar que los valores sean distintos para realizar la actualización

        await this.updateStock(queryRunner, supply, oldRecordData.amount, true);
      }

      // Update
      for (const supply of toUpdate) {
        const oldRecordData: SuppliesConsumptionDetails = oldDetails.find(
          (record: SuppliesConsumptionDetails) => record.supply.id === supply,
        );

        // Decrement antiguo valor

        await this.updateStock(queryRunner, supply, oldRecordData.amount, true);

        // Increment nuevo valor
        const newRecordData = newDetails.find(
          (record) => record.supply === supply,
        );

        await this.updateStock(
          queryRunner,
          supply,
          newRecordData.amount,
          false,
        );

        // Update register

        await this.updateConsumptionDetails(
          queryRunner,
          { consumption: id, supply },
          { ...newRecordData },
        );
      }

      // Create
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
      // Decrement stock
      for (const record of details) {
        await this.updateStock(
          queryRunner,
          record.supply.id,
          record.amount,
          true,
        );
      }
      // Delete Purchase
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
    const consumption =
      this.suppliesConsumptionRepository.createQueryBuilder('consumption');

    try {
      await consumption.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  private handleDBExceptions(error: any) {
    console.log(error);
    if (error.code === '23503') throw new BadRequestException(error.detail);
    if (error.code === '23505') throw new BadRequestException(error.detail);
    if (error instanceof InsufficientSupplyStockException)
      throw new BadRequestException(error.message);

    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
