import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { MoreThan, Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { BaseTenantService } from 'src/common/services/base-tenant.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { BulkRemovalHelper } from 'src/common/helpers/bulk-removal.helper';

@Injectable()
export class SuppliersService extends BaseTenantService {
  protected readonly logger = new Logger('SuppliersService');
  private supplierRepository: Repository<Supplier>;

  constructor(
    @Inject(REQUEST) request: Request,
    private readonly handlerError: HandlerErrorService,
  ) {
    super(request);
    this.setLogger(this.logger);
    this.supplierRepository = this.getTenantRepository(Supplier);
  }

  async create(createSupplierDto: CreateSupplierDto) {
    this.logWithContext(
      `Creating new supplier with email: ${createSupplierDto.email}`,
    );

    try {
      const supplier = this.supplierRepository.create(createSupplierDto);
      const savedSupplier = await this.supplierRepository.save(supplier);

      this.logWithContext(
        `Supplier created successfully with ID: ${savedSupplier.id}`,
      );
      return savedSupplier;
    } catch (error) {
      this.logWithContext(
        `Failed to create supplier with email: ${createSupplierDto.email}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAll(queryParams: QueryParamsDto) {
    this.logWithContext(
      `Finding all suppliers with query: "${queryParams.query || 'no query'}", limit: ${queryParams.limit || 10}, offset: ${queryParams.offset || 0}, all_records: ${queryParams.all_records || false}`,
    );

    try {
      const {
        query = '',
        limit = 10,
        offset = 0,
        all_records = false,
      } = queryParams;

      const queryBuilder =
        this.supplierRepository.createQueryBuilder('suppliers');

      !!query &&
        !all_records &&
        queryBuilder
          .where('CAST(suppliers.id AS TEXT) ILIKE :query', {
            query: `${query}%`,
          })
          .orWhere('suppliers.first_name ILIKE :query', { query: `${query}%` })
          .orWhere('suppliers.last_name ILIKE :query', { query: `${query}%` })
          .orWhere('suppliers.email ILIKE :query', { query: `${query}%` });

      !all_records && queryBuilder.take(limit).skip(offset * limit);

      const [suppliers, count] = await queryBuilder.getManyAndCount();

      this.logWithContext(
        `Found ${suppliers.length} suppliers out of ${count} total suppliers`,
      );

      if (suppliers.length === 0 && count > 0) {
        throw new NotFoundException(
          'There are no supplier records with the requested pagination',
        );
      }

      return {
        total_row_count: count,
        current_row_count: suppliers.length,
        total_page_count: all_records ? 1 : Math.ceil(count / limit),
        current_page_count: all_records ? 1 : offset + 1,
        records: suppliers,
      };
    } catch (error) {
      this.logWithContext(
        `Failed to find suppliers with query: "${queryParams.query || 'no query'}"`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllSuppliersWithShopping() {
    this.logWithContext('Finding all suppliers with shopping records');

    try {
      const [suppliers, count] = await this.supplierRepository.findAndCount({
        withDeleted: true,
        where: {
          supplies_shopping_details: MoreThan(0),
        },
        relations: {
          supplies_shopping_details: true,
        },
      });

      this.logWithContext(
        `Found ${suppliers.length} suppliers with shopping records`,
      );

      return {
        total_row_count: count,
        current_row_count: suppliers.length,
        total_page_count: 1,
        current_page_count: 1,
        records: suppliers,
      };
    } catch (error) {
      this.logWithContext(
        'Failed to find suppliers with shopping records',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOne(id: string) {
    this.logWithContext(`Finding supplier by ID: ${id}`);

    try {
      const supplier = await this.supplierRepository.findOne({
        where: { id },
        relations: {
          supplies_shopping_details: {
            supply: true,
            shopping: true,
          },
        },
        order: {
          supplies_shopping_details: {
            shopping: {
              date: 'DESC',
            },
          },
        },
      });

      if (!supplier) {
        this.logWithContext(`Supplier with ID: ${id} not found`, 'warn');
        throw new NotFoundException(`Supplier with id: ${id} not found`);
      }

      this.logWithContext(`Supplier found successfully with ID: ${id}`);
      return supplier;
    } catch (error) {
      this.logWithContext(`Failed to find supplier with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    this.logWithContext(`Updating supplier with ID: ${id}`);

    try {
      await this.findOne(id);
      await this.supplierRepository.update(id, updateSupplierDto);
      const updatedSupplier = await this.findOne(id);

      this.logWithContext(`Supplier updated successfully with ID: ${id}`);
      return updatedSupplier;
    } catch (error) {
      this.logWithContext(`Failed to update supplier with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    this.logWithContext(`Attempting to remove supplier with ID: ${id}`);

    try {
      const supplier = await this.findOne(id);
      await this.supplierRepository.softRemove(supplier);

      this.logWithContext(`Supplier with ID: ${id} removed successfully`);
    } catch (error) {
      this.logWithContext(`Failed to remove supplier with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async deleteAllSupplier() {
    this.logWithContext(
      'Deleting ALL suppliers - this is a destructive operation',
      'warn',
    );

    try {
      await this.supplierRepository.query(
        'TRUNCATE TABLE suppliers RESTART IDENTITY CASCADE',
      );
      this.logWithContext('All suppliers deleted successfully');
    } catch (error) {
      this.logWithContext('Failed to delete all suppliers', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulk(removeBulkSuppliersDto: RemoveBulkRecordsDto<Supplier>) {
    try {
      return await BulkRemovalHelper.executeBulkRemoval(
        removeBulkSuppliersDto.recordsIds,
        (id: string) => this.remove(id),
        this.logger,
        { entityName: 'suppliers' },
      );
    } catch (error) {
      this.logWithContext(
        'Failed to execute bulk removal of suppliers',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }
}
