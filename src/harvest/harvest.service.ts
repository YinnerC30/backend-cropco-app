import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { Harvest } from './entities/harvest.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HarvestDetails } from './entities/harvest-details.entity';
import { HarvestStock } from './entities/harvest-stock.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { HarvestStockDto } from './dto/create-harvest-stock.dto';
import { organizeIDsToUpdateEntity } from 'src/common/helpers/organizeIDsToUpdateEntity';

@Injectable()
export class HarvestService {
  private readonly logger = new Logger('HarvestsService');
  constructor(
    @InjectRepository(Harvest)
    private readonly harvestRepository: Repository<Harvest>,

    @InjectRepository(HarvestDetails)
    private readonly harvestDetailsRepository: Repository<HarvestDetails>,

    @InjectRepository(HarvestStock)
    private readonly harvestStockRepository: Repository<HarvestStock>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createHarvestDto: CreateHarvestDto) {
    // Crear e iniciar la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { harvest_details, ...rest } = createHarvestDto;

      // Validar valores numéricos
      // const totalHarvest = rest.total;
      // const valuePay = rest.value_pay;

      // const totalArray = harvest_details.reduce((acumulador, record) => {
      //   return acumulador + record.total;
      // }, 0);

      // const valuePayArray = harvest_details.reduce((acumulador, record) => {
      //   return acumulador + record.value_pay;
      // }, 0);

      // const isTotalValid = totalHarvest === totalArray;
      // const isValuePayValid = valuePay === valuePayArray;

      // if (!(isTotalValid && isValuePayValid)) {
      //   return;
      // TODO: Retornar excepción personalizada
      // }

      // Guardar Cosecha
      const harvest = queryRunner.manager.create(Harvest, { ...rest });
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

      // Agregar cosecha al stock de
      const { crop, total } = rest;

      console.log('Aquí reventó');

      const stockRegister = await this.harvestStockRepository
        .createQueryBuilder('harvestStock')
        .where(`harvestStock.cropId = '${createHarvestDto.crop}'`)
        .getOne();

      if (!stockRegister) {
        const harvestStock: HarvestStockDto = queryRunner.manager.create(
          HarvestStock,
          {
            total: 0,
            crop,
          },
        );

        await queryRunner.manager.save(harvestStock);
      }

      await queryRunner.manager.increment(
        HarvestStock,
        { crop },
        'total',
        total,
      );

      await queryRunner.commitTransaction();
      await queryRunner.release();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
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

  async update(id: string, updateHarvestDto: UpdateHarvestDto) {
    // Crear e iniciar la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Obtener detalles de cosecha antigua
    const harvest = await this.findOne(id);
    // return harvest;

    try {
      // Obtener detalles de cosecha nueva
      // Nuevos
      const newHarvestDetails = updateHarvestDto.harvest_details;
      const newIDsEmployees = newHarvestDetails.map((record) =>
        new String(record.employee).toString(),
      );
      // Antiguos
      const oldHarvestDetails = harvest.harvest_details;
      const oldIDsEmployees = oldHarvestDetails.map((record) =>
        new String(record.employee.id).toString(),
      );

      const { toCreate, toDelete, toUpdate } = organizeIDsToUpdateEntity(
        newIDsEmployees,
        oldIDsEmployees,
      );

      // Eliminar diferencias
      // Registros y decrement el total del stock
      let arrayRecordsToDelete = [];

      for (const employeeId of toDelete) {
        arrayRecordsToDelete.push(
          queryRunner.manager.delete(HarvestDetails, { employee: employeeId }),
        );
      }
      await Promise.all(arrayRecordsToDelete);

      // Actualizar diferencias
      // Encontrar id de harvestDetails y actualizar valores

      let arrayRecordsToUpdate = [];
      for (const employeeId of toUpdate) {
        const dataRecord = newHarvestDetails.find(
          (record) => record.employee === employeeId,
        );

        arrayRecordsToUpdate.push(
          queryRunner.manager.update(
            HarvestDetails,
            { harvest: id },
            dataRecord,
          ),
        );
      }
      await Promise.all(arrayRecordsToUpdate);

      // Crear nuevos registros
      // Crear registros
      let arrayRecordsToCreate = [];
      for (const employeeId of toCreate) {
        const dataRecord = newHarvestDetails.find(
          (record) => record.employee === employeeId,
        );

        const recordToCreate = queryRunner.manager.create(HarvestDetails, {
          harvest: id,
          ...dataRecord,
        });

        arrayRecordsToCreate.push(queryRunner.manager.save(recordToCreate));
      }
      await Promise.all(arrayRecordsToCreate);

      //  Incrementar stock cosecha

      await queryRunner.manager.decrement(
        HarvestStock,
        { crop: updateHarvestDto.crop },
        'total',
        harvest.total,
      );

      await queryRunner.manager.increment(
        HarvestStock,
        { crop: updateHarvestDto.crop },
        'total',
        updateHarvestDto.total,
      );

      // Actualizar cosecha
      const { harvest_details, ...rest } = updateHarvestDto;
      await queryRunner.manager.update(Harvest, { id }, rest);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string) {
    const harvest: Harvest = await this.findOne(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete HarvestDetails
      await queryRunner.manager.delete(HarvestDetails, {
        harvest: id,
      });

      // Decrement stock

      await queryRunner.manager.decrement(
        HarvestStock,
        { crop: harvest.crop.id },
        'total',
        harvest.total,
      );

      // Delete Harvest
      await queryRunner.manager.remove(harvest);

      await queryRunner.commitTransaction();
      // await queryRunner.rollbackTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAllHarvest() {
    // TODO: Usar QueryRunner

    const harvest = this.harvestRepository.createQueryBuilder('harvest');
    const harvestDetails =
      this.harvestDetailsRepository.createQueryBuilder('harvestDetails');
    const harvestStock =
      this.harvestStockRepository.createQueryBuilder('harvestStock');

    try {
      await harvestStock.delete().where({}).execute();
      await harvestDetails.delete().where({}).execute();
      await harvest.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  private handleDBExceptions(error: any) {
    console.log(error);
    if (error.code === '23503') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
