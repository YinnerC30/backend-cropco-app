import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryParams } from 'src/common/dto/QueryParams';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { Like, Repository } from 'typeorm';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { Crop } from './entities/crop.entity';

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
      search = '',
      limit = 10,
      offset = 0,
      allRecords = false,
    } = queryParams;

    let crops;

    if (allRecords === true) {
      crops = await this.cropRepository.find({
        where: [
          {
            name: Like(`${search}%`),
          },
          {
            location: Like(`${search}%`),
          },
        ],
        order: {
          name: 'ASC',
        },
      });
    } else {
      crops = await this.cropRepository.find({
        where: [
          {
            name: Like(`${search}%`),
          },
          {
            location: Like(`${search}%`),
          },
        ],
        order: {
          name: 'ASC',
        },
        take: limit,
        skip: offset * limit,
      });
    }

    let count: number;
    if (search.length === 0) {
      count = await this.cropRepository.count();
    } else {
      count = crops.length;
    }

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
}
