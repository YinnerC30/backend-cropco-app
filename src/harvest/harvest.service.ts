import { Inject, Injectable } from '@nestjs/common';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { Harvest } from './entities/harvest.entity';
import { Repository } from 'typeorm';

@Injectable()
export class HarvestService {
  constructor(
    @Inject('HARVEST_REPOSITORY')
    private readonly harvestRepository: Repository<Harvest>,
  ) {}

  async create(createHarvestDto: CreateHarvestDto) {
    const harvest: Harvest = this.harvestRepository.create(createHarvestDto);
    await this.harvestRepository.save(harvest);
    return harvest;
  }

  findAll() {
    return `This action returns all harvest`;
  }

  findOne(id: number) {
    return `This action returns a #${id} harvest`;
  }

  update(id: number, updateHarvestDto: UpdateHarvestDto) {
    return `This action updates a #${id} harvest`;
  }

  remove(id: number) {
    return `This action removes a #${id} harvest`;
  }
}
