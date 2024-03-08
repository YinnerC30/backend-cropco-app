import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { DataSource, Repository } from 'typeorm';
import { Supply } from './entities/supply.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePurchaseSuppliesDto } from './dto/create-purchase-supplies.dto';
import { SuppliesPurchase } from './entities/supplies-purchase.entity';
import { SuppliesPurchaseDetails } from './entities/supplies-purchase-details.entity';
import { SuppliesStock } from './entities/supplies-stock.entity';
import { UpdateSuppliesPurchaseDto } from './dto/update-supplies-purchase.dto';
import { organizeIDsToUpdateEntity } from 'src/common/helpers/organizeIDsToUpdateEntity';
import { validateTotalPurchase } from './helpers/validateTotalPurchase';
import { QueryRunner } from 'typeorm';

import { PurchaseSuppliesDetailsDto } from './dto/purchase-supplies-details.dto';
import { Condition } from './interfaces/condition.interface';

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
      await queryRunner.manager.increment(
        SuppliesStock,
        { supply: supplyId },
        'amount',
        amount,
      );
    } else {
      await queryRunner.manager.decrement(
        SuppliesStock,
        { supply: supplyId },
        'amount',
        amount,
      );
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
      // Guardar compra
      const purchase = queryRunner.manager.create(SuppliesPurchase, {
        ...rest,
      });
      const { id } = await queryRunner.manager.save(purchase);

      // Guardar detalles de cosecha
      const arrayPromises = [];

      for (const register of details) {
        arrayPromises.push(
          this.createPurchaseDetails(queryRunner, {
            purchase: id,
            ...register,
          }),
        );
      }

      await Promise.all(arrayPromises);

      // Agregar insumo al stock de

      for (const item of details) {
        const { amount } = item;
        await this.updateStock(queryRunner, item.supply, amount, true);
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
      // TODO: Add type
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
      // Delete PurchaseDetails

      await this.removePurchaseDetails(queryRunner, {
        purchase: id,
      });

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
    const suppliesStock =
      this.suppliesStockRepository.createQueryBuilder('suppliesStock');

    try {
      await suppliesStock.delete().where({}).execute();
      await purchaseDetails.delete().where({}).execute();
      await purchase.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  // Methods to consumption Supplies

  // TODO: Implementar todos los métodos para consumption

  async createConsumption() {
    return 'Consumption Successful';
  }

  private handleDBExceptions(error: any) {
    console.log(error);
    if (error.code === '23503') throw new BadRequestException(error.detail);
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
