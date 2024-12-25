import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryParams } from 'src/common/dto/QueryParams';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { ILike, IsNull, Not, Repository } from 'typeorm';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { Crop } from './entities/crop.entity';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';

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
      allRecords = false,
    } = queryParams;

    let crops;

    const searchCondition = {
      name: ILike(`${query}%`),
    };

    if (allRecords === true) {
      crops = await this.cropRepository.find({
        where: [searchCondition],
        order: {
          name: 'ASC',
        },
      });
    } else {
      crops = await this.cropRepository.find({
        where: [searchCondition],
        order: {
          name: 'ASC',
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

  async findAllWithWork(queryParams: QueryParams) {
    const { limit = 10 } = queryParams;
    const [crops, count] = await this.cropRepository.findAndCount({
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
      pageCount: Math.ceil(count / limit),
    };
  }

  async findOne(id: string) {
    const crop = await this.cropRepository
      .createQueryBuilder('crop')
      .leftJoinAndSelect('crop.harvests_stock', 'harvestsStock')
      .leftJoinAndSelect('crop.harvests', 'harvest', 'harvest.cropId = crop.id')
      .select(['crop', 'harvestsStock', 'SUM(harvest.total) AS harvestsTotal'])
      .where('crop.id = :id', { id })
      .groupBy('crop.id')
      .addGroupBy('harvestsStock.id')
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
    await this.cropRepository.remove(crop);
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
}
