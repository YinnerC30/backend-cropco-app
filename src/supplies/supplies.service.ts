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
import { UnitConversionService } from 'src/common/unit-conversion/unit-conversion.service';

@Injectable()
export class SuppliesService {
  private readonly logger = new Logger('SuppliesService');

  constructor(
    @InjectRepository(Supply)
    private readonly supplyRepository: Repository<Supply>,

    @InjectRepository(SuppliesStock)
    private readonly suppliesStockRepository: Repository<SuppliesStock>,
    private readonly handlerError: HandlerErrorService,
    private readonly unitConversionService: UnitConversionService,
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
      queryBuilder.orWhere('supplies.brand ILIKE :query', {
        query: `${query}%`,
      });
    }

    !all_records && queryBuilder.take(limit).skip(offset * limit);

    queryBuilder.orderBy('supplies.name', 'ASC');

    const [supplies, count] = await queryBuilder.getManyAndCount();
    if (supplies.length === 0 && count > 0) {
      throw new NotFoundException(
        'There are no supply records with the requested pagination',
      );
    }

    // Mapear los supplies para asegurar un stock por defecto
    const suppliesWithDefaultStock = supplies.map((supply) => ({
      ...supply,
      stock: supply.stock || {
        id: null,
        amount: 0,
        createdDate: new Date(),
        updatedDate: new Date(),
        deletedDate: null,
      },
    }));

    return {
      total_row_count: count,
      current_row_count: supplies.length,
      total_page_count: all_records ? 1 : Math.ceil(count / limit),
      current_page_count: all_records ? 1 : offset + 1,
      records: suppliesWithDefaultStock,
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
    const suppliesStock = await this.supplyRepository
      .createQueryBuilder('supply')
      .leftJoin('supply.stock', 'stock')
      .select([
        'supply.id AS id',
        'supply.name AS name',
        'supply.brand AS brand',
        'supply.observation AS observation',
        'supply.unit_of_measure AS unit_of_measure',
        'supply.createdDate AS createdDate',
        'supply.updatedDate AS updatedDate',
        'supply.deletedDate AS deletedDate',
        'COALESCE(stock.amount, 0) as amount',
      ])
      .where('stock.amount > :amount', { amount: 0 })
      .orderBy('supply.name', 'ASC')
      .getRawMany();

    return {
      total_row_count: suppliesStock.length,
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

  async updateStock(
    queryRunner: QueryRunner,
    info: {
      supplyId: any;
      amount: number;
      type_update: 'increment' | 'decrement';
      inputUnit?: string;
    },
  ) {
    const { supplyId, amount, type_update, inputUnit } = info;

    // Cargar la entidad Supply
    const supply = await queryRunner.manager.findOne(Supply, {
      where: { id: supplyId },
    });

    if (!supply) {
      throw new NotFoundException(`Supply with id: ${supplyId} not found`);
    }

    // Si se proporciona una unidad de entrada diferente, convertir la cantidad
    let finalAmount = amount;
    if (inputUnit && inputUnit !== supply.unit_of_measure) {
      if (!this.unitConversionService.isValidUnit(inputUnit)) {
        throw new Error(`Invalid input unit: ${inputUnit}`);
      }
      finalAmount = this.unitConversionService.convert(
        amount,
        inputUnit as any,
        supply.unit_of_measure,
      );
    }

    // Buscar el registro de stock
    let recordSupplyStock = await queryRunner.manager.findOne(SuppliesStock, {
      where: { supply: { id: supplyId } },
      relations: ['supply'],
    });

    if (!recordSupplyStock) {
      const newRecord = queryRunner.manager.create(SuppliesStock, {
        supply: supply,
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
        finalAmount,
      );

      if (result.affected === 0) {
        throw new NotFoundException(
          `Supply with id: ${supplyId} not incremented`,
        );
      }
    } else if (type_update === 'decrement') {
      const amountActually = recordSupplyStock.amount;

      if (amountActually < finalAmount) {
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
        finalAmount,
      );

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
