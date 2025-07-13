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
import { BaseTenantService } from 'src/common/services/base-tenant.service';
import { DataSource, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { Crop } from './entities/crop.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class CropsService extends BaseTenantService {
  protected readonly logger = new Logger('CropsService');
  private cropRepository: Repository<Crop>;

  constructor(
    @Inject(REQUEST) request: Request,
    private readonly handlerError: HandlerErrorService,
  ) {
    super(request);
    this.setLogger(this.logger);
    this.cropRepository = this.getTenantRepository(Crop);
  }

  async create(createCropDto: CreateCropDto) {
    this.logWithContext(`Creating new crop with name: ${createCropDto.name}`);

    try {
      const crop = this.cropRepository.create(createCropDto);
      const savedCrop = await this.cropRepository.save(crop);

      this.logWithContext(`Crop created successfully with ID: ${savedCrop.id}`);
      return savedCrop;
    } catch (error) {
      this.logWithContext(
        `Failed to create crop with name: ${createCropDto.name}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAll(queryParams: QueryParamsDto) {
    this.logWithContext(
      `Finding all crops with query: "${queryParams.query || 'no query'}", limit: ${queryParams.limit || 10}, offset: ${queryParams.offset || 0}, all_records: ${queryParams.all_records || false}`,
    );

    try {
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

      this.logWithContext(
        `Found ${crops.length} crops out of ${count} total crops`,
      );

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
    } catch (error) {
      this.logWithContext(
        `Failed to find crops with query: "${queryParams.query || 'no query'}"`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllWithHarvest(queryParams: QueryParamsDto) {
    this.logWithContext('Finding all crops with harvests');

    try {
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

      this.logWithContext(`Found ${crops.length} crops with harvests`);

      return {
        total_row_count: count,
        current_row_count: count,
        total_page_count: count > 0 ? 1 : 0,
        records: crops,
      };
    } catch (error) {
      this.logWithContext('Failed to find crops with harvests', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllWithWork() {
    this.logWithContext('Finding all crops with works');

    try {
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

      this.logWithContext(`Found ${crops.length} crops with works`);

      return {
        total_row_count: count,
        current_row_count: count,
        total_page_count: count > 0 ? 1 : 0,
        records: crops,
      };
    } catch (error) {
      this.logWithContext('Failed to find crops with works', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllWithSales() {
    this.logWithContext('Finding all crops with sales');

    try {
      const [crops, count] = await this.cropRepository.findAndCount({
        withDeleted: true,
        where: {
          sales_detail: MoreThan(0),
        },
        relations: {
          sales_detail: true,
        },
      });

      this.logWithContext(`Found ${crops.length} crops with sales`);

      return {
        total_row_count: count,
        current_row_count: count,
        total_page_count: count > 0 ? 1 : 0,
        records: crops,
      };
    } catch (error) {
      this.logWithContext('Failed to find crops with sales', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllWithConsumptions() {
    this.logWithContext('Finding all crops with consumptions');

    try {
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

      this.logWithContext(`Found ${crops.length} crops with consumptions`);

      return {
        total_row_count: count,
        current_row_count: count,
        total_page_count: count > 0 ? 1 : 0,
        records: crops,
      };
    } catch (error) {
      this.logWithContext('Failed to find crops with consumptions', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findAllCropsWithStock() {
    this.logWithContext('Finding all crops with stock');

    try {
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

      this.logWithContext(`Found ${crops.length} crops with stock`);

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
    } catch (error) {
      this.logWithContext('Failed to find crops with stock', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOne(id: string) {
    this.logWithContext(`Finding crop by ID: ${id}`);

    try {
      // const crop = await this.cropRepository
      //   .createQueryBuilder('crop')
      //   .leftJoinAndSelect('crop.sales_detail', 'sales_detail')
      //   .leftJoinAndSelect('crop.harvests_stock', 'harvestsStock')
      //   .leftJoinAndSelect('crop.harvests', 'harvest', 'harvest.cropId = crop.id')
      //   .leftJoinAndSelect(
      //     'crop.supplies_consumption_details',
      //     'supplies_consumption_details',
      //   )
      //   .select([
      //     'crop',
      //     'harvestsStock',
      //     'SUM(harvest.amount) AS harvestsTotal',
      //     'supplies_consumption_details',
      //     'sales_detail',
      //   ])
      //   .where('crop.id = :id', { id })
      //   .groupBy('crop.id')
      //   .addGroupBy('sales_detail.id')
      //   .addGroupBy('harvestsStock.id')
      //   .addGroupBy('supplies_consumption_details.id')
      //   .getOne();

      const crop = await this.cropRepository.findOne({
        where: { id },
        relations: {
          harvests: true,
          works: true,
          harvests_stock: true,
          harvests_processed: {
            harvest: true,
          },
          sales_detail: {
            sale: true,
          },
          supplies_consumption_details: {
            consumption: true,
            supply: true,
          },
        },
        order: {
          harvests: {
            date: 'DESC',
          },
          works: {
            date: 'DESC',
          },
          harvests_processed: {
            date: 'DESC',
          },
          sales_detail: {
            sale: {
              date: 'DESC',
            },
          },
          supplies_consumption_details: {
            consumption: {
              date: 'DESC',
            },
          },
        },
      });

      if (!crop) {
        this.logWithContext(`Crop with ID: ${id} not found`, 'warn');
        throw new NotFoundException(`Crop with id: ${id} not found`);
      }

      this.logWithContext(`Crop found successfully with ID: ${id}`);
      return crop;
    } catch (error) {
      this.logWithContext(`Failed to find crop with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async update(id: string, updateCropDto: UpdateCropDto) {
    this.logWithContext(`Updating crop with ID: ${id}`);

    try {
      await this.findOne(id);
      await this.cropRepository.update(id, updateCropDto);
      const updatedCrop = await this.findOne(id);

      this.logWithContext(`Crop updated successfully with ID: ${id}`);
      return updatedCrop;
    } catch (error) {
      this.logWithContext(`Failed to update crop with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    this.logWithContext(`Attempting to remove crop with ID: ${id}`);

    try {
      const crop = await this.findOne(id);

      if (crop.harvests_stock !== null && crop.harvests_stock.amount > 0) {
        this.logWithContext(
          `Cannot remove crop with ID: ${id} - has stock available (${crop.harvests_stock.amount})`,
          'warn',
        );
        throw new ConflictException(
          `Crop with id ${crop.id} has stock available`,
        );
      }

      await this.cropRepository.softRemove(crop);
      this.logWithContext(`Crop with ID: ${id} removed successfully`);
    } catch (error) {
      this.logWithContext(`Failed to remove crop with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async deleteAllCrops() {
    this.logWithContext(
      'Deleting ALL crops - this is a destructive operation',
      'warn',
    );

    try {
      await this.cropRepository.delete({});
      this.logWithContext('All crops deleted successfully');
    } catch (error) {
      this.logWithContext('Failed to delete all crops', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulk(removeBulkCropsDto: RemoveBulkRecordsDto<Crop>) {
    this.logWithContext(
      `Starting bulk removal of ${removeBulkCropsDto.recordsIds.length} crops`,
    );

    try {
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

      this.logWithContext(
        `Bulk removal completed. Success: ${success.length}, Failed: ${failed.length}`,
      );

      return { success, failed };
    } catch (error) {
      this.logWithContext('Failed to execute bulk removal of crops', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findCountHarvestsAndTotalStock({
    year = new Date().getFullYear(),
  }: QueryForYearDto) {
    this.logWithContext(
      `Finding harvest count and total stock for crops in year: ${year}`,
    );

    try {
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

      this.logWithContext(
        `Found ${count} crops with harvest data for year: ${year}`,
      );

      return {
        total_row_count: count,
        current_row_count: count,
        total_page_count: count > 0 ? 1 : 0,
        current_page_count: count > 0 ? 1 : 0,
        records: crops,
      };
    } catch (error) {
      this.logWithContext(
        `Failed to find harvest count and total stock for year: ${year}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }
}
