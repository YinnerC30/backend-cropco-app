import { Inject, Injectable } from '@nestjs/common';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { Harvest } from './entities/harvest.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HarvestDetails } from './entities/harvest-details.entity';

@Injectable()
export class HarvestService {
  constructor(
    @InjectRepository(Harvest)
    private readonly harvestRepository: Repository<Harvest>,
    private dataSource: DataSource,
  ) {}

  async create(createHarvestDto: CreateHarvestDto) {
    // Crear e iniciar la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { harvest_details, ...rest } = createHarvestDto;

      // Guardar Cosecha
      const harvest = queryRunner.manager.create(Harvest, rest);
      const { id } = await queryRunner.manager.save(harvest);

      // Guardar detalles de cosecha
      const arrayPromises = [];

      for (const register of harvest_details) {
        const registerToSave = queryRunner.manager.create(HarvestDetails, {
          harvest: id,
          ...register,
        });

        arrayPromises.push(queryRunner.manager.save(registerToSave));
      }

      await Promise.all(arrayPromises);

      // Finalizar transacción
      await queryRunner.commitTransaction();
      await queryRunner.release();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
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
