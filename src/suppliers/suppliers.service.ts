import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { handleDBExceptions } from 'src/common/helpers/handle-db-exceptions';
import { ILike, MoreThan, Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger('SuppliersService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto) {
    try {
      const supplier = this.supplierRepository.create(createSupplierDto);
      await this.supplierRepository.save(supplier);
      return supplier;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(queryParams: QueryParamsDto) {
    const { query: search = '', limit = 10, offset = 0 } = queryParams;

    const suppliers = await this.supplierRepository.find({
      where: [
        {
          first_name: ILike(`${search}%`),
        },
        {
          email: ILike(`${search}%`),
        },
      ],
      order: {
        first_name: 'ASC',
      },
      take: limit,
      skip: offset * limit,
    });

    let count: number;
    if (search.length === 0) {
      count = await this.supplierRepository.count();
    } else {
      count = suppliers.length;
    }

    return {
      rowCount: count,
      rows: suppliers,
      pageCount: Math.ceil(count / limit),
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
    }
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
    } catch (error) {
      this.handleDBExceptions(error);
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
      this.handleDBExceptions(error);
    }
  }

  async removeBulk(removeBulkSuppliersDto: RemoveBulkRecordsDto<Supplier>) {
    for (const { id } of removeBulkSuppliersDto.recordsIds) {
      await this.remove(id);
    }
  }
}
