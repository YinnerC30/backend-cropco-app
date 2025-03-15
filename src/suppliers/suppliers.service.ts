import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { ILike, MoreThan, Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { HandlerErrorService } from 'src/common/services/handler-error.service';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger('SuppliersService');

  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly handlerError: HandlerErrorService,
  ) {
    this.handlerError.setLogger(this.logger);
  }

  async create(createSupplierDto: CreateSupplierDto) {
    try {
      const supplier = this.supplierRepository.create(createSupplierDto);
      await this.supplierRepository.save(supplier);
      return supplier;
    } catch (error) {
      this.handlerError.handle(error);
    }
  }

  async findAll(queryParams: QueryParamsDto) {
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
        .where('suppliers.first_name ILIKE :query', { query: `${query}%` })
        .orWhere('suppliers.last_name ILIKE :query', { query: `${query}%` })
        .orWhere('suppliers.email ILIKE :query', { query: `${query}%` });

    !all_records && queryBuilder.take(limit).skip(offset * limit);

    const [suppliers, count] = await queryBuilder.getManyAndCount();

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
  }

  async findAllSuppliersWithShopping() {
    const suppliers = await this.supplierRepository.find({
      where: {
        supplies_shopping_details: MoreThan(0),
      },
      relations: {
        supplies_shopping_details: true,
      },
    });
    return {
      rowCount: suppliers.length,
      rows: suppliers,
    };
  }

  async findOne(id: string) {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: {
        supplies_shopping_details: {
          supply: true,
        },
      },
    });
    if (!supplier)
      throw new NotFoundException(`Supplier with id: ${id} not found`);
    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    await this.findOne(id);
    try {
      await this.supplierRepository.update(id, updateSupplierDto);
      return await this.findOne(id);
    } catch (error) {
      this.handlerError.handle(error);
    }
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);
    await this.supplierRepository.softRemove(supplier);
  }

  async deleteAllSupplier() {
    try {
      await this.supplierRepository.delete({});
    } catch (error) {
      this.handlerError.handle(error);
    }
  }

  async removeBulk(removeBulkSuppliersDto: RemoveBulkRecordsDto<Supplier>) {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const { id } of removeBulkSuppliersDto.recordsIds) {
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
