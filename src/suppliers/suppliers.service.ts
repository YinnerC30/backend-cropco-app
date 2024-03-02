import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Supplier } from './entities/supplier.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger('SuppliersService');
  constructor(
    @Inject('SUPPLIER_REPOSITORY')
    private supplierRepository: Repository<Supplier>,
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
    await this.supplierRepository.update(id, updateSupplierDto);
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);
    await this.supplierRepository.remove(supplier);
  }

  async deleteAllSupplier() {
    const query = this.supplierRepository.createQueryBuilder('supplier');

    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  private handleDBExceptions(error: any) {
    console.log(error);
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
