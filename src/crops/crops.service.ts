import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryParams } from 'src/common/dto/QueryParams';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { ILike, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { Crop } from './entities/crop.entity';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { QueryForYear } from 'src/common/dto/QueryForYear';

@Injectable()
export class CropsService {
  private readonly logger = new Logger('CropsService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Crop)
    private readonly cropRepository: Repository<Crop>,
  ) {}

  async create(createCropDto: CreateCropDto) {
    try {
      const crop = this.cropRepository.create(createCropDto);
      await this.cropRepository.save(crop);
      return crop;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(queryParams: QueryParams) {
    const {
      query = '',
      limit = 10,
      offset = 0,
      all_records = false,
    } = queryParams;

    let crops;

    const searchCondition = {
      name: ILike(`${query}%`),
    };

    if (all_records === true) {
      crops = await this.cropRepository.find({
        // withDeleted: true,
        where: [searchCondition],
        order: {
          name: 'ASC',
        },
        relations: {
          harvests_stock: true,
        },
      });
    } else {
      crops = await this.cropRepository.find({
        where: [searchCondition],
        order: {
          name: 'ASC',
        },
        relations: {
          harvests_stock: true,
        },
        take: limit,
        skip: offset * limit,
      });
    }

    const count =
      query.length === 0 ? await this.cropRepository.count() : crops.length;

    return {
      rowCount: count,
      rows: crops,
      pageCount: Math.ceil(count / limit),
    };
  }
  async findAllWithHarvest(queryParams: QueryParams) {
    const { limit = 10 } = queryParams;
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
      rowCount: count,
      rows: crops,
      pageCount: Math.ceil(count / limit),
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
      rowCount: count,
      rows: crops,
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
      rowCount: count,
      rows: crops,
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
      rowCount: count,
      rows: crops,
    };
  }

  async findAllCropsWithStock() {
    const crops = await this.cropRepository.find({
      where: {
        harvests_stock: {
          total: MoreThan(0),
        },
      },
      relations: {
        harvests_stock: true,
      },
    });

    return {
      rowCount: crops.length,
      rows: crops.map((item) => ({
        id: item.id,
        name: item.name,
        stock: item.harvests_stock.total,
      })),
      pageCount: crops.length > 0 ? 1 : 0,
    };

    // return crops;
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
        'SUM(harvest.total) AS harvestsTotal',
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
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const crop = await this.findOne(id);

    if (crop.harvests_stock !== null && crop.harvests_stock.total > 0) {
      throw new ConflictException('Crop has stock available');
    }

    await this.cropRepository.softRemove(crop);
  }

  async deleteAllCrops() {
    try {
      await this.cropRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async removeBulk(removeBulkCropsDto: RemoveBulkRecordsDto<Crop>) {
    for (const { id } of removeBulkCropsDto.recordsIds) {
      await this.remove(id);
    }
  }

  async findCountHarvestsAndTotalStock({
    year = new Date().getFullYear(),
  }: QueryForYear) {
    const crops = await this.cropRepository
      .createQueryBuilder('crops')
      .leftJoin('crops.harvests', 'harvests')
      .select([
        'crops.id as id',
        'crops.name as name',
        'CAST(COUNT(harvests.id) AS INTEGER) AS total_harvests',
        'CAST(SUM(harvests.total) AS INTEGER) AS total_stock',
      ])
      .where('EXTRACT(YEAR FROM harvests.date) = :year', { year })
      .groupBy('crops.id')
      .orderBy('total_harvests', 'DESC')
      .addOrderBy('total_stock', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      rowCount: crops.length,
      rows: crops,
    };
  }
}
