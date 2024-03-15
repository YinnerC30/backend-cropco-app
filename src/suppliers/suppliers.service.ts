import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Supplier } from './entities/supplier.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';

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

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    return this.supplierRepository.find({
      order: {
        first_name: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    const supplier = await this.supplierRepository.findOneBy({ id });
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
    await this.supplierRepository.remove(supplier);
  }

  async deleteAllSupplier() {
    try {
      await this.supplierRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
