import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { Repository } from 'typeorm';
import { Crop } from './entities/crop.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';

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

  findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    return this.cropRepository.find({
      order: {
        name: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    const crop = await this.cropRepository.findOneBy({ id });
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
    const query = this.cropRepository.createQueryBuilder('crop');

    try {
      await query.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
