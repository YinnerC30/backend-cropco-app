import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { Harvest } from './entities/harvest.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HarvestDetails } from './entities/harvest-details.entity';
import { HarvestStock } from './entities/harvest-stock.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class HarvestService {
  constructor(
    @InjectRepository(Harvest)
    private readonly harvestRepository: Repository<Harvest>,

    @InjectRepository(HarvestStock)
    private readonly harvestStockRepository: Repository<HarvestStock>,
    private readonly dataSource: DataSource,
    private transactionalEntityManager: EntityManager,
  ) {}

  async create(createHarvestDto: CreateHarvestDto) {
    // Crear e iniciar la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { harvest_details, ...rest } = createHarvestDto;

      // Guardar Cosecha
      const harvest = queryRunner.manager.create(Harvest, { ...rest });
      console.log(harvest);
      const { id } = await queryRunner.manager.save(harvest);

      // Guardar detalles de cosecha
      const arrayPromises = [];

      for (const register of harvest_details) {
        const registerToSave = queryRunner.manager.create(HarvestDetails, {
          harvestId: id,
          ...register,
        });

        arrayPromises.push(queryRunner.manager.save(registerToSave));
      }

      await Promise.all(arrayPromises);

      // TODO: Agregar cosecha al Stock
      // const { cropId, total } = rest;

      // console.log({ cropId });

      // const stockRegister = await this.dataSource
      //   .getRepository(HarvestStock)
      //   .createQueryBuilder('harvest_stock')
      //   .where('harvest_stock.cropId = :cropId', { cropId })
      //   .getOne();

      // console.log({ stockRegister });

      // if (!stockRegister) {
      //   const harvestStock: HarvestStockDto = queryRunner.manager.create(
      //     HarvestStock,
      //     {
      //       cropId,
      //       total,
      //     },
      //   );

      //   await queryRunner.manager.save(harvestStock);
      // }

      // await queryRunner.manager.increment(
      //   HarvestStock,
      //   { where: { cropId } },
      //   'total',
      //   total,
      // );

      // Finalizar transacción
      await queryRunner.commitTransaction();
      // await queryRunner.rollbackTransaction();
      await queryRunner.release();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      console.log(error);
    }
  }

  findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    return this.harvestRepository.find({
      order: {
        date: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    const harvest = await this.harvestRepository.findOne({
      where: {
        id,
      },
      relations: { harvest_details: true },
    });
    if (!harvest)
      throw new NotFoundException(`Harvest with id: ${id} not found`);
    return harvest;
  }

  update(id: number, updateHarvestDto: UpdateHarvestDto) {
    // TODO: Implementar método
    return `This action updates a #${id} harvest`;
  }

  async remove(id: string) {
    const harvest = await this.findOne(id);

    // TODO: Solucionar restricción por llave foránea en harvest_details

    await this.dataSource.manager.transaction(
      async (transactionalEntityManager) => {
        await transactionalEntityManager.remove(harvest);
      },
    );
  }

  // TODO: Crear método para controlar excepciones
}
