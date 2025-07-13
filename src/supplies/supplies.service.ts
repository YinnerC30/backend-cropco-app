import {
  ConflictException,
  Inject,
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
import { BaseTenantService } from 'src/common/services/base-tenant.service';
import { SuppliesStock } from 'src/supplies/entities/supplies-stock.entity';
import { InsufficientSupplyStockException } from './exceptions/insufficient-supply-stock.exception';
import { UnitConversionService } from 'src/common/unit-conversion/unit-conversion.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class SuppliesService extends BaseTenantService {
  protected readonly logger = new Logger('SuppliesService');
  private supplyRepository: Repository<Supply>;
  private suppliesStockRepository: Repository<SuppliesStock>;

  constructor(
    @Inject(REQUEST) request: Request,
    private readonly handlerError: HandlerErrorService,
    private readonly unitConversionService: UnitConversionService,
  ) {
    super(request);
    this.setLogger(this.logger);
    this.supplyRepository = this.getTenantRepository(Supply);
    this.suppliesStockRepository = this.getTenantRepository(SuppliesStock);
  }

  async create(createSupply: CreateSupplyDto) {
    this.logWithContext(`Creating new supply with name: ${createSupply.name}`);

    try {
      const supply = this.supplyRepository.create(createSupply);
      const savedSupply = await this.supplyRepository.save(supply);

      this.logWithContext(
        `Supply created successfully with ID: ${savedSupply.id}`,
      );
      return savedSupply;
    } catch (error) {
      this.logWithContext(
        `Failed to create supply with name: ${createSupply.name}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAll(queryParams: QueryParamsDto) {
    this.logWithContext(
      `Finding all supplies with query: "${queryParams.query || 'no query'}", limit: ${queryParams.limit || 10}, offset: ${queryParams.offset || 0}, all_records: ${queryParams.all_records || false}`,
    );

    try {
      const {
        query = '',
        limit = 10,
        offset = 0,
        all_records = false,
      } = queryParams;

      const queryBuilder = this.supplyRepository.createQueryBuilder('supplies');
      queryBuilder.leftJoinAndSelect('supplies.stock', 'stock');

      if (!!query && !all_records) {
        queryBuilder.where('supplies.name ILIKE :query', {
          query: `${query}%`,
        });
        queryBuilder.orWhere('supplies.brand ILIKE :query', {
          query: `${query}%`,
        });
      }

      !all_records && queryBuilder.take(limit).skip(offset * limit);

      queryBuilder.orderBy('supplies.name', 'ASC');

      const [supplies, count] = await queryBuilder.getManyAndCount();

      this.logWithContext(
        `Found ${supplies.length} supplies out of ${count} total supplies`,
      );

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
    } catch (error) {
      this.logWithContext(
        `Failed to find supplies with query: "${queryParams.query || 'no query'}"`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllSuppliesWithShopping() {
    this.logWithContext('Finding all supplies with shopping records');

    try {
      const [supplies, count] = await this.supplyRepository.findAndCount({
        where: {
          shopping_details: MoreThan(0),
        },
        relations: {
          shopping_details: true,
        },
      });

      this.logWithContext(
        `Found ${supplies.length} supplies with shopping records`,
      );

      return {
        total_row_count: count,
        current_row_count: count,
        total_page_count: count > 0 && 1,
        current_page_count: count > 0 && 1,
        records: supplies,
      };
    } catch (error) {
      this.logWithContext(
        'Failed to find supplies with shopping records',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllWithConsumptions() {
    this.logWithContext('Finding all supplies with consumption records');

    try {
      const [supplies, count] = await this.supplyRepository.findAndCount({
        where: {
          consumption_details: MoreThan(0),
        },
        relations: {
          consumption_details: true,
        },
      });

      this.logWithContext(
        `Found ${supplies.length} supplies with consumption records`,
      );

      return {
        total_row_count: count,
        current_row_count: count,
        total_page_count: count > 0 && 1,
        current_page_count: count > 0 && 1,
        records: supplies,
      };
    } catch (error) {
      this.logWithContext(
        'Failed to find supplies with consumption records',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOne(id: string) {
    this.logWithContext(`Finding supply by ID: ${id}`);

    try {
      const supply = await this.supplyRepository.findOne({
        where: { id },
        relations: {
          stock: true,
          consumption_details: { consumption: true, supply: true, crop: true },
          shopping_details: { shopping: true, supply: true, supplier: true },
        },
        order: {
          consumption_details: {
            consumption: {
              date: 'desc',
            },
          },
          shopping_details: {
            shopping: {
              date: 'DESC',
            },
          },
        },
      });

      if (!supply) {
        this.logWithContext(`Supply with ID: ${id} not found`, 'warn');
        throw new NotFoundException(`Supply with id: ${id} not found`);
      }

      this.logWithContext(`Supply found successfully with ID: ${id}`);
      return supply;
    } catch (error) {
      this.logWithContext(`Failed to find supply with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async update(id: string, updateSupplyDto: UpdateSupplyDto) {
    this.logWithContext(`Updating supply with ID: ${id}`);

    try {
      await this.findOne(id);
      await this.supplyRepository.update(id, updateSupplyDto);
      const updatedSupply = await this.findOne(id);

      this.logWithContext(`Supply updated successfully with ID: ${id}`);
      return updatedSupply;
    } catch (error) {
      this.logWithContext(`Failed to update supply with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    this.logWithContext(`Attempting to remove supply with ID: ${id}`);

    try {
      const supply = await this.findOne(id);

      if (supply.stock !== null && supply.stock.amount > 0) {
        this.logWithContext(
          `Cannot remove supply with ID: ${id} - has stock available (${supply.stock.amount} ${supply.unit_of_measure})`,
          'warn',
        );
        throw new ConflictException(
          `Supply with id ${supply.id} has stock available`,
        );
      }

      await this.supplyRepository.softRemove(supply);
      this.logWithContext(`Supply with ID: ${id} removed successfully`);
    } catch (error) {
      this.logWithContext(`Failed to remove supply with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async deleteAllSupplies() {
    this.logWithContext(
      'Deleting ALL supplies - this is a destructive operation',
      'warn',
    );

    try {
      await this.supplyRepository.delete({});
      this.logWithContext('All supplies deleted successfully');
    } catch (error) {
      this.logWithContext('Failed to delete all supplies', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllSuppliesStock() {
    this.logWithContext('Finding all supplies with available stock');

    try {
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

      this.logWithContext(
        `Found ${suppliesStock.length} supplies with available stock`,
      );

      return {
        total_row_count: suppliesStock.length,
        current_row_count: suppliesStock.length,
        total_page_count: 1,
        current_page_count: 1,
        records: suppliesStock,
      };
    } catch (error) {
      this.logWithContext('Failed to find supplies with stock', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOneStock(supplyId: string) {
    this.logWithContext(`Finding stock for supply ID: ${supplyId}`);

    try {
      const supplyStock = await this.suppliesStockRepository.findOne({
        where: {
          supply: { id: supplyId },
        },
      });

      if (supplyStock) {
        this.logWithContext(
          `Stock found for supply ID: ${supplyId}, amount: ${supplyStock.amount}`,
        );
      } else {
        this.logWithContext(
          `No stock record found for supply ID: ${supplyId}`,
          'warn',
        );
      }

      return supplyStock;
    } catch (error) {
      this.logWithContext(
        `Failed to find stock for supply ID: ${supplyId}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
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

    this.logWithContext(
      `Updating stock for supply ID: ${supplyId}, operation: ${type_update}, amount: ${amount}${inputUnit ? ` ${inputUnit}` : ''}`,
    );

    try {
      // Cargar la entidad Supply
      const supply = await queryRunner.manager.findOne(Supply, {
        where: { id: supplyId },
      });

      if (!supply) {
        this.logWithContext(
          `Supply with ID: ${supplyId} not found for stock update`,
          'warn',
        );
        throw new NotFoundException(`Supply with id: ${supplyId} not found`);
      }

      // Si se proporciona una unidad de entrada diferente, convertir la cantidad
      let finalAmount = amount;
      if (inputUnit && inputUnit !== supply.unit_of_measure) {
        if (!this.unitConversionService.isValidUnit(inputUnit)) {
          this.logWithContext(
            `Invalid input unit: ${inputUnit} for supply ID: ${supplyId}`,
            'error',
          );
          throw new Error(`Invalid input unit: ${inputUnit}`);
        }
        finalAmount = this.unitConversionService.convert(
          amount,
          inputUnit as any,
          supply.unit_of_measure,
        );
        this.logWithContext(
          `Unit conversion applied: ${amount} ${inputUnit} = ${finalAmount} ${supply.unit_of_measure}`,
        );
      }

      // Buscar el registro de stock
      let recordSupplyStock = await queryRunner.manager.findOne(SuppliesStock, {
        where: { supply: { id: supplyId } },
        relations: ['supply'],
      });

      if (!recordSupplyStock) {
        this.logWithContext(
          `Creating new stock record for supply ID: ${supplyId}`,
        );
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
          this.logWithContext(
            `Failed to increment stock for supply ID: ${supplyId}`,
            'error',
          );
          throw new NotFoundException(
            `Supply with id: ${supplyId} not incremented`,
          );
        }

        this.logWithContext(
          `Stock incremented successfully for supply ID: ${supplyId}, added: ${finalAmount} ${supply.unit_of_measure}`,
        );
      } else if (type_update === 'decrement') {
        const amountActually = recordSupplyStock.amount;

        if (amountActually < finalAmount) {
          this.logWithContext(
            `Insufficient stock for supply ID: ${supplyId}, available: ${amountActually}, requested: ${finalAmount}`,
            'warn',
          );
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
          this.logWithContext(
            `Failed to decrement stock for supply ID: ${supplyId}`,
            'error',
          );
          throw new NotFoundException(
            `Supply with id: ${supplyId} not decremented`,
          );
        }

        this.logWithContext(
          `Stock decremented successfully for supply ID: ${supplyId}, removed: ${finalAmount} ${supply.unit_of_measure}`,
        );
      }
    } catch (error) {
      this.logWithContext(
        `Failed to update stock for supply ID: ${supplyId}, operation: ${type_update}`,
        'error',
      );
      // Re-throw the error since this method is used in transactions
      throw error;
    }
  }

  async deleteAllStockSupplies() {
    this.logWithContext(
      'Deleting ALL supplies stock - this is a destructive operation',
      'warn',
    );

    try {
      await this.suppliesStockRepository.delete({});
      this.logWithContext('All supplies stock deleted successfully');
    } catch (error) {
      this.logWithContext('Failed to delete all supplies stock', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulk(removeBulkSuppliesDto: RemoveBulkRecordsDto<Supply>) {
    this.logWithContext(
      `Starting bulk removal of ${removeBulkSuppliesDto.recordsIds.length} supplies`,
    );

    try {
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

      this.logWithContext(
        `Bulk removal completed. Success: ${success.length}, Failed: ${failed.length}`,
      );

      return { success, failed };
    } catch (error) {
      this.logWithContext(
        'Failed to execute bulk removal of supplies',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }
}
