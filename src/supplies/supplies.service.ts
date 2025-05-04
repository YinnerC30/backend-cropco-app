import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { QueryParamsDto } from 'src/common/dto/query-params.dto';

import { CreateSupplyDto } from './dto/create-supply.dto';

import { UpdateSupplyDto } from './dto/update-supply.dto';

import { MoreThan, QueryRunner, Repository } from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';

import { Supply } from './entities/';

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';

import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { SuppliesStock } from 'src/supplies/entities/supplies-stock.entity';
import { InsufficientSupplyStockException } from './exceptions/insufficient-supply-stock.exception';

@Injectable()
export class SuppliesService {
  private readonly logger = new Logger('SuppliesService');

  constructor(
    @InjectRepository(Supply)
    private readonly supplyRepository: Repository<Supply>,

    @InjectRepository(SuppliesStock)
    private readonly suppliesStockRepository: Repository<SuppliesStock>,
    private readonly handlerError: HandlerErrorService,
  ) {}

  async create(createSupply: CreateSupplyDto) {
    try {
      const supply = this.supplyRepository.create(createSupply);
      await this.supplyRepository.save(supply);
      return supply;
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAll(queryParams: QueryParamsDto) {
    const {
      query = '',
      limit = 10,
      offset = 0,
      all_records = false,
    } = queryParams;

    const queryBuilder = this.supplyRepository.createQueryBuilder('supplies');
    queryBuilder.leftJoinAndSelect('supplies.stock', 'stock');

    if (!!query && !all_records) {
      queryBuilder.where('supplies.name ILIKE :query', { query: `${query}%` });
      queryBuilder.where('supplies.brand ILIKE :query', { query: `${query}%` });
    }

    !all_records && queryBuilder.take(limit).skip(offset * limit);

    queryBuilder.orderBy('supplies.name', 'ASC');

    const [supplies, count] = await queryBuilder.getManyAndCount();
    if (supplies.length === 0 && count > 0) {
      throw new NotFoundException(
        'There are no supply records with the requested pagination',
      );
    }
    return {
      total_row_count: count,
      current_row_count: supplies.length,
      total_page_count: all_records ? 1 : Math.ceil(count / limit),
      current_page_count: all_records ? 1 : offset + 1,
      records: supplies,
    };
  }

  async findAllSuppliesWithShopping() {
    const [supplies, count] = await this.supplyRepository.findAndCount({
      where: {
        shopping_details: MoreThan(0),
      },
      relations: {
        shopping_details: true,
      },
    });
    return {
      total_row_count: count,
      current_row_count: count,
      total_page_count: count > 0 && 1,
      current_page_count: count > 0 && 1,
      records: supplies,
    };
  }
  async findAllWithConsumptions() {
    const [supplies, count] = await this.supplyRepository.findAndCount({
      where: {
        consumption_details: MoreThan(0),
      },
      relations: {
        consumption_details: true,
      },
    });
    return {
      total_row_count: count,
      current_row_count: count,
      total_page_count: count > 0 && 1,
      current_page_count: count > 0 && 1,
      records: supplies,
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
    try {
      await this.supplyRepository.update(id, updateSupplyDto);
      return await this.findOne(id);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    const supply = await this.findOne(id);

    if (supply.stock !== null && supply.stock.amount > 0) {
      throw new ConflictException(
        `Supply with id ${supply.id} has stock available`,
      );
    }

    await this.supplyRepository.softRemove(supply);
  }

  async deleteAllSupplies() {
    try {
      await this.supplyRepository.delete({});
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllSuppliesStock() {
    const [suppliesStock, count] = await this.supplyRepository.findAndCount({
      relations: {
        stock: true,
      },
      where: {
        stock: {
          amount: MoreThan(0),
        },
      },
      order: {
        name: 'ASC',
      },
    });

    return {
      total_row_count: count,
      current_row_count: suppliesStock.length,
      total_page_count: 1,
      current_page_count: 1,
      records: suppliesStock,
    };
  }

  async findOneStock(supplyId: string) {
    const supplyStock = await this.suppliesStockRepository.findOne({
      where: {
        supply: { id: supplyId },
      },
    });

    return supplyStock;
  }

  async updateStockManual(id: string, amount: number) {
    return await this.suppliesStockRepository.update(id, { amount });
  }

  async updateStock(
    queryRunner: QueryRunner,
    info: {
      supplyId: any;
      amount: number;
      type_update: 'increment' | 'decrement';
    },
  ) {
    const { supplyId, amount, type_update } = info;

    this.logger.log(
      `Actualizando stock para supplyId: ${supplyId} con tipo: ${type_update} y cantidad: ${amount}`,
    );

    // Cargar la entidad Supply
    const supply = await queryRunner.manager.findOne(Supply, {
      where: { id: supplyId },
    });

    if (!supply) {
      throw new NotFoundException(`Supply with id: ${supplyId} not found`);
    }

    // Buscar el registro de stock
    let recordSupplyStock = await queryRunner.manager.findOne(SuppliesStock, {
      where: { supply: { id: supplyId } },
      relations: ['supply'],
    });

    if (!recordSupplyStock) {
      this.logger.warn(
        `Creando nuevo registro de stock para supplyId: ${supplyId}`,
      );

      const newRecord = queryRunner.manager.create(SuppliesStock, {
        supply: supply, // <-- Usamos la entidad completa
        amount: 0,
      });

      await queryRunner.manager.save(SuppliesStock, newRecord);

      recordSupplyStock = newRecord;
    }

    if (type_update === 'increment') {
      const result = await queryRunner.manager.increment(
        SuppliesStock,
        { supply: supplyId },
        'amount',
        amount,
      );

      this.logger.verbose('Increment result:', result);

      if (result.affected === 0) {
        throw new NotFoundException(
          `Supply with id: ${supplyId} not incremented`,
        );
      }
    } else if (type_update === 'decrement') {
      const amountActually = recordSupplyStock.amount;

      if (amountActually < amount) {
        throw new InsufficientSupplyStockException(
          amountActually,
          supply.name,
          supply.unit_of_measure,
        );
      }

      const result = await queryRunner.manager.decrement(
        SuppliesStock,
        { supply: supplyId },
        'amount',
        amount,
      );

      this.logger.verbose('Decrement result:', result);

      if (result.affected === 0) {
        throw new NotFoundException(
          `Supply with id: ${supplyId} not decremented`,
        );
      }
    }
  }

  async deleteAllStockSupplies() {
    try {
      await this.suppliesStockRepository.delete({});
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulk(removeBulkSuppliesDto: RemoveBulkRecordsDto<Supply>) {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const { id } of removeBulkSuppliesDto.recordsIds) {
      try {
        await this.remove(id);
        success.push(id);
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }

    return { success, failed };
  }
}
