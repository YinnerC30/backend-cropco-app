import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryForYearDto } from 'src/common/dto/query-for-year.dto';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { DataSource, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { Crop } from './entities/crop.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class CropsService {
  private readonly logger = new Logger('CropsService');

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @InjectRepository(Crop)
    private cropRepository: Repository<Crop>,
    private readonly handlerError: HandlerErrorService,
  ) {
    this.cropRepository = this.request['tenantConnection'].getRepository(Crop);
  }

  async create(createCropDto: CreateCropDto) {
    try {
      const crop = this.cropRepository.create(createCropDto);
      await this.cropRepository.save(crop);
      return crop;
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

    const queryBuilder = this.cropRepository.createQueryBuilder('crops');
    queryBuilder.leftJoinAndSelect('crops.harvests_stock', 'harvests_stock');

    !!query &&
      !all_records &&
      queryBuilder.where('crops.name ILIKE :query', { query: `${query}%` });

    !all_records && queryBuilder.take(limit).skip(offset * limit);

    queryBuilder.orderBy('crops.name', 'ASC');

    const [crops, count] = await queryBuilder.getManyAndCount();
    if (crops.length === 0 && count > 0) {
      throw new NotFoundException(
        'There are no crop records with the requested pagination',
      );
    }

    // Mapear los crops para asegurar un stock por defecto
    const cropsWithDefaultStock = crops.map((crop) => ({
      ...crop,
      harvests_stock: crop.harvests_stock || {
        id: null,
        amount: 0,
        createdDate: new Date(),
        updatedDate: new Date(),
        deletedDate: null,
      },
    }));

    return {
      total_row_count: count,
      current_row_count: crops.length,
      total_page_count: all_records ? 1 : Math.ceil(count / limit),
      current_page_count: all_records ? 1 : offset + 1,
      records: cropsWithDefaultStock,
    };
  }
  async findAllWithHarvest(queryParams: QueryParamsDto) {
    const [crops, count] = await this.cropRepository.findAndCount({
      withDeleted: true,
      where: {
        harvests: {
          id: Not(IsNull()),
        },
      },
      relations: {
        harvests: true,
      },
    });
    return {
      total_row_count: count,
      current_row_count: count,
      total_page_count: count > 0 ? 1 : 0,
      records: crops,
    };
  }

  async findAllWithWork() {
    const [crops, count] = await this.cropRepository.findAndCount({
      withDeleted: true,
      where: {
        works: {
          id: Not(IsNull()),
        },
      },
      relations: {
        works: true,
      },
    });
    return {
      total_row_count: count,
      current_row_count: count,
      total_page_count: count > 0 ? 1 : 0,
      records: crops,
    };
  }
  async findAllWithSales() {
    const [crops, count] = await this.cropRepository.findAndCount({
      withDeleted: true,
      where: {
        sales_detail: MoreThan(0),
      },
      relations: {
        sales_detail: true,
      },
    });
    return {
      total_row_count: count,
      current_row_count: count,
      total_page_count: count > 0 ? 1 : 0,
      records: crops,
    };
  }
  async findAllWithConsumptions() {
    const [crops, count] = await this.cropRepository.findAndCount({
      withDeleted: true,
      where: {
        supplies_consumption_details: MoreThan(0),
      },
      relations: {
        supplies_consumption_details: {
          crop: true,
        },
      },
    });
    return {
      total_row_count: count,
      current_row_count: count,
      total_page_count: count > 0 ? 1 : 0,
      records: crops,
    };
  }

  async findAllCropsWithStock() {
    const [crops, count] = await this.cropRepository.findAndCount({
      where: {
        harvests_stock: {
          amount: MoreThan(0),
        },
      },
      relations: {
        harvests_stock: true,
      },
      take: 5,
    });

    return {
      total_row_count: count,
      current_row_count: count,
      total_page_count: count > 0 ? 1 : 0,
      current_page_count: count > 0 ? 1 : 0,
      records: crops.map((item) => ({
        id: item.id,
        name: item.name,
        stock: item.harvests_stock.amount,
      })),
    };
  }

  async findOne(id: string) {
    const crop = await this.cropRepository
      .createQueryBuilder('crop')
      .leftJoinAndSelect('crop.sales_detail', 'sales_detail')
      .leftJoinAndSelect('crop.harvests_stock', 'harvestsStock')
      .leftJoinAndSelect('crop.harvests', 'harvest', 'harvest.cropId = crop.id')
      .leftJoinAndSelect(
        'crop.supplies_consumption_details',
        'supplies_consumption_details',
      )
      .select([
        'crop',
        'harvestsStock',
        'SUM(harvest.amount) AS harvestsTotal',
        'supplies_consumption_details',
        'sales_detail',
      ])
      .where('crop.id = :id', { id })
      .groupBy('crop.id')
      .addGroupBy('sales_detail.id')
      .addGroupBy('harvestsStock.id')
      .addGroupBy('supplies_consumption_details.id')
      .getOne();

    if (!crop) throw new NotFoundException(`Crop with id: ${id} not found`);
    return crop;
  }

  async update(id: string, updateCropDto: UpdateCropDto) {
    await this.findOne(id);
    try {
      await this.cropRepository.update(id, updateCropDto);
      return await this.findOne(id);
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    const crop = await this.findOne(id);

    if (crop.harvests_stock !== null && crop.harvests_stock.amount > 0) {
      throw new ConflictException(
        `Crop with id ${crop.id} has stock available`,
      );
    }
    await this.cropRepository.softRemove(crop);
  }

  // INFO: Método solo para el modo desarrollo
  async deleteAllCrops() {
    try {
      await this.cropRepository.delete({});
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulk(removeBulkCropsDto: RemoveBulkRecordsDto<Crop>) {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const { id } of removeBulkCropsDto.recordsIds) {
      try {
        await this.remove(id);
        success.push(id);
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }
    return { success, failed };
  }

  async findCountHarvestsAndTotalStock({
    year = new Date().getFullYear(),
  }: QueryForYearDto) {
    const crops = await this.cropRepository
      .createQueryBuilder('crops')
      .leftJoin('crops.harvests', 'harvests')
      .select([
        'crops.id as id',
        'crops.name as name',
        'CAST(COUNT(harvests.id) AS INTEGER) AS total_harvests',
        'CAST(SUM(harvests.amount) AS INTEGER) AS total_amount',
      ])
      .where('EXTRACT(YEAR FROM harvests.date) = :year', { year })
      .groupBy('crops.id')
      .orderBy('total_harvests', 'DESC')
      .addOrderBy('total_amount', 'DESC')
      .limit(5)
      .getRawMany();

    const count = crops.length;

    return {
      total_row_count: count,
      current_row_count: count,
      total_page_count: count > 0 ? 1 : 0,
      current_page_count: count > 0 ? 1 : 0,
      records: crops,
    };
  }
}
