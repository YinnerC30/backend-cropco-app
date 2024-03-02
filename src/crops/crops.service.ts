import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { Repository } from 'typeorm';
import { Crop } from './entities/crop.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class CropsService {
  logger: any;
  constructor(
    @Inject('CROP_REPOSITORY')
    private cropRepository: Repository<Crop>,
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
    try {
      await this.cropRepository.update(id, updateCropDto);
      return updateCropDto;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const crop = await this.findOne(id);
    return this.cropRepository.remove(crop);
  }

  async deleteAllCrops() {
    const query = this.cropRepository.createQueryBuilder('crop');

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
