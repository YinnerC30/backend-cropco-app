import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { organizeIDsToUpdateEntity } from 'src/common/helpers';
import { getComparisonOperator } from 'src/common/helpers/get-comparison-operator';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { PrinterService } from 'src/printer/printer.service';
import { Condition } from 'src/supplies/interfaces/condition.interface';
import { SuppliesService } from 'src/supplies/supplies.service';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { QueryParamsShopping } from './dto/query-params-shopping.dto';
import { ShoppingSuppliesDetailsDto } from './dto/shopping-supplies-details.dto';
import { ShoppingSuppliesDto } from './dto/shopping-supplies.dto';
import { SuppliesShopping, SuppliesShoppingDetails } from './entities';
import { getShoppingReport } from './reports/get-shopping';
import { UnitConversionService } from 'src/common/unit-conversion/unit-conversion.service';

@Injectable()
export class ShoppingService {
  private readonly logger = new Logger('ShoppingService');

  constructor(
    @InjectRepository(SuppliesShopping)
    private readonly suppliesShoppingRepository: Repository<SuppliesShopping>,
    @InjectRepository(SuppliesShoppingDetails)
    private readonly suppliesShoppingDetailsRepository: Repository<SuppliesShoppingDetails>,

    private readonly suppliesService: SuppliesService,

    private dataSource: DataSource,
    private printerService: PrinterService,
    private readonly handlerError: HandlerErrorService,
    private readonly unitConversionService: UnitConversionService,
  ) {}

  async createShoppingDetails(
    queryRunner: QueryRunner,
    data: ShoppingSuppliesDetailsDto,
  ) {
    const recordToSave = queryRunner.manager.create(
      SuppliesShoppingDetails,
      data,
    );
    await queryRunner.manager.save(SuppliesShoppingDetails, recordToSave);
    return recordToSave;
  }

  async updateShoppingDetails(
    queryRunner: QueryRunner,
    condition: Condition,
    data: ShoppingSuppliesDetailsDto,
  ) {
    return await queryRunner.manager.update(
      SuppliesShoppingDetails,
      condition,
      data,
    );
  }

  async removeShoppingDetails(queryRunner: QueryRunner, condition: Condition) {
    return await queryRunner.manager.delete(SuppliesShoppingDetails, condition);
  }

  async createShopping(createShoppingSuppliesDto: ShoppingSuppliesDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { details, ...rest } = createShoppingSuppliesDto;

      let shoppingDetails: SuppliesShoppingDetails[] = [];

      for (const record of details) {
        // Verificar que la unidad de medida sea válida
        if (!this.unitConversionService.isValidUnit(record.unit_of_measure)) {
          throw new BadRequestException(
            `Unidad de medida inválida: ${record.unit_of_measure}`,
          );
        }

        // Obtener el suministro para verificar su unidad de medida
        const supply = await this.suppliesService.findOne(record.supply.id);

        // Verificar que las unidades sean del mismo tipo (masa o volumen)
        if (
          this.unitConversionService.getUnitType(record.unit_of_measure) !==
          this.unitConversionService.getUnitType(supply.unit_of_measure)
        ) {
          throw new BadRequestException(
            `No se puede convertir entre unidades de ${record.unit_of_measure} y ${supply.unit_of_measure}`,
          );
        }

        shoppingDetails.push(
          queryRunner.manager.create(SuppliesShoppingDetails, record),
        );

        await this.suppliesService.updateStock(queryRunner, {
          supplyId: record.supply.id,
          amount: record.amount,
          type_update: 'increment',
          inputUnit: record.unit_of_measure,
        });
      }

      const shopping = queryRunner.manager.create(SuppliesShopping, {
        ...rest,
      });

      shopping.details = shoppingDetails;

      await queryRunner.manager.save(shopping);

      await queryRunner.commitTransaction();
      return shopping;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async findAllShopping(queryParams: QueryParamsShopping) {
    const {
      limit = 10,
      offset = 0,

      filter_by_date = false,
      type_filter_date,
      date,

      filter_by_value_pay = false,
      type_filter_value_pay,
      value_pay,

      suppliers = [],
      supplies = [],
    } = queryParams;

    const queryBuilder = this.suppliesShoppingRepository
      .createQueryBuilder('supplies_shopping')
      .withDeleted()
      .leftJoinAndSelect('supplies_shopping.details', 'details')
      .leftJoinAndSelect('details.supply', 'supply')
      .leftJoinAndSelect('details.supplier', 'supplier')
      .orderBy('supplies_shopping.date', 'DESC')
      .take(limit)
      .skip(offset * limit);

    filter_by_date &&
      queryBuilder.andWhere(
        `supplies_shopping.date ${getComparisonOperator(type_filter_date)} :date`,
        {
          date,
        },
      );

    filter_by_value_pay &&
      queryBuilder.andWhere(
        `supplies_shopping.value_pay ${getComparisonOperator(type_filter_value_pay)} :value_pay`,
        {
          value_pay,
        },
      );

    suppliers.length > 0 &&
      queryBuilder.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('sc.id')
          .from('supplies_shopping', 'sc')
          .leftJoin('sc.details', 'd')
          .leftJoin('d.supplier', 's')
          .where('s.id IN (:...suppliers)', { suppliers })
          .getQuery();
        return 'supplies_shopping.id IN ' + subQuery;
      });

    supplies.length > 0 &&
      queryBuilder.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('sc.id')
          .from('supplies_shopping', 'sc')
          .leftJoin('sc.details', 'd')
          .leftJoin('d.supply', 's')
          .where('s.id IN (:...supplies)', { supplies })
          .getQuery();
        return 'supplies_shopping.id IN ' + subQuery;
      });

    const [shopping, count] = await queryBuilder.getManyAndCount();

    if (shopping.length === 0 && count > 0) {
      throw new NotFoundException(
        'There are no shopping records with the requested pagination',
      );
    }

    return {
      total_row_count: count,
      current_row_count: shopping.length,
      total_page_count: Math.ceil(count / limit),
      current_page_count: shopping.length > 0 ? offset + 1 : 0,
      records: shopping,
    };
  }

  async findOneShopping(id: string) {
    const supplyShopping = await this.suppliesShoppingRepository.findOne({
      withDeleted: true,
      where: { id },
      relations: {
        details: {
          supplier: true,
          supply: true,
        },
      },
    });
    if (!supplyShopping)
      throw new NotFoundException(`Supplies Shopping with id: ${id} not found`);
    return supplyShopping;
  }

  async updateShopping(
    id: string,
    updateSuppliesShoppingDto: ShoppingSuppliesDto,
  ) {
    const shopping = await this.findOneShopping(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldDetails: SuppliesShoppingDetails[] = shopping.details;
      const newDetails: ShoppingSuppliesDetailsDto[] =
        updateSuppliesShoppingDto.details;

      const oldIDsShoppingDetails: string[] = oldDetails.map(
        (record: SuppliesShoppingDetails) => record.id,
      );
      const newIDsShoppingDetails: string[] = newDetails.map((record) =>
        new String(record.id).toString(),
      );

      const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
        newIDsShoppingDetails,
        oldIDsShoppingDetails,
      );

      for (const detailId of toDelete) {
        const oldRecordData: SuppliesShoppingDetails = oldDetails.find(
          (record: SuppliesShoppingDetails) => record.id === detailId,
        );

        if (oldRecordData.deletedDate !== null) {
          throw new BadRequestException(
            `You cannot delete the record with id ${detailId} , it is linked to other records.`,
          );
        }

        await this.suppliesService.updateStock(queryRunner, {
          supplyId: oldRecordData.supply.id,
          amount: oldRecordData.amount,
          type_update: 'decrement',
          inputUnit: oldRecordData.unit_of_measure,
        });

        await this.removeShoppingDetails(queryRunner, {
          id: detailId,
        });
      }

      for (const detailId of toUpdate) {
        const oldRecordData = oldDetails.find(
          (record: SuppliesShoppingDetails) => record.id === detailId,
        );
        const dataRecordNew = newDetails.find(
          (record) => record.id === detailId,
        );

        // Verificar que la unidad de medida sea válida
        if (
          !this.unitConversionService.isValidUnit(dataRecordNew.unit_of_measure)
        ) {
          throw new BadRequestException(
            `Unidad de medida inválida: ${dataRecordNew.unit_of_measure}`,
          );
        }

        // Obtener el suministro para verificar su unidad de medida
        const supply = await this.suppliesService.findOne(
          dataRecordNew.supply.id,
        );

        // Verificar que las unidades sean del mismo tipo (masa o volumen)
        if (
          this.unitConversionService.getUnitType(
            dataRecordNew.unit_of_measure,
          ) !== this.unitConversionService.getUnitType(supply.unit_of_measure)
        ) {
          throw new BadRequestException(
            `No se puede convertir entre unidades de ${dataRecordNew.unit_of_measure} y ${supply.unit_of_measure}`,
          );
        }

        const valuesAreDifferent =
          dataRecordNew.value_pay !== oldRecordData.value_pay ||
          dataRecordNew.amount !== oldRecordData.amount ||
          dataRecordNew.unit_of_measure !== oldRecordData.unit_of_measure;

        if (valuesAreDifferent && oldRecordData.deletedDate !== null) {
          throw new BadRequestException(
            `You cannot update the record with id ${detailId} , it is linked to other records.`,
          );
        }

        await this.suppliesService.updateStock(queryRunner, {
          supplyId: oldRecordData.supply.id,
          amount: oldRecordData.amount,
          type_update: 'decrement',
          inputUnit: oldRecordData.unit_of_measure,
        });

        await this.suppliesService.updateStock(queryRunner, {
          supplyId: dataRecordNew.supply.id,
          amount: dataRecordNew.amount,
          type_update: 'increment',
          inputUnit: dataRecordNew.unit_of_measure,
        });

        await this.updateShoppingDetails(
          queryRunner,
          { id: detailId },
          { ...dataRecordNew },
        );
      }

      for (const detailId of toCreate) {
        const newRecordData = newDetails.find(
          (record) => record.id === detailId,
        );

        // Verificar que la unidad de medida sea válida
        if (
          !this.unitConversionService.isValidUnit(newRecordData.unit_of_measure)
        ) {
          throw new BadRequestException(
            `Unidad de medida inválida: ${newRecordData.unit_of_measure}`,
          );
        }

        // Obtener el suministro para verificar su unidad de medida
        const supply = await this.suppliesService.findOne(
          newRecordData.supply.id,
        );

        // Verificar que las unidades sean del mismo tipo (masa o volumen)
        if (
          this.unitConversionService.getUnitType(
            newRecordData.unit_of_measure,
          ) !== this.unitConversionService.getUnitType(supply.unit_of_measure)
        ) {
          throw new BadRequestException(
            `No se puede convertir entre unidades de ${newRecordData.unit_of_measure} y ${supply.unit_of_measure}`,
          );
        }

        await this.createShoppingDetails(queryRunner, {
          shopping: id as any,
          ...newRecordData,
        });

        await this.suppliesService.updateStock(queryRunner, {
          supplyId: newRecordData.supply.id,
          amount: newRecordData.amount,
          type_update: 'increment',
          inputUnit: newRecordData.unit_of_measure,
        });
      }

      const { details, ...rest } = updateSuppliesShoppingDto;
      await queryRunner.manager.update(SuppliesShopping, { id }, rest);

      await queryRunner.commitTransaction();
      return await this.findOneShopping(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async removeShopping(id: string) {
    const shoppingSupply = await this.findOneShopping(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { details } = shoppingSupply;
      for (const record of details) {
        if (record.supply.deletedDate !== null) {
          continue;
        }

        await this.suppliesService.updateStock(queryRunner, {
          supplyId: record.supply.id,
          amount: record.amount,
          type_update: 'decrement',
          inputUnit: record.unit_of_measure,
        });
      }

      await queryRunner.manager.remove(shoppingSupply);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async removeBulkShopping(
    removeBulkShoppingDto: RemoveBulkRecordsDto<SuppliesShopping>,
  ) {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const { id } of removeBulkShoppingDto.recordsIds) {
      try {
        await this.removeShopping(id);
        success.push(id);
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }

    return { success, failed };
  }

  async deleteAllShoppingSupplies() {
    try {
      await this.suppliesShoppingRepository.delete({});
    } catch (error) {
      this.handlerError.handle(error, this.logger);
    }
  }

  async exportShoppingToPDF(id: string) {
    const shopping = await this.findOneShopping(id);
    const docDefinition = getShoppingReport({ data: shopping });
    return this.printerService.createPdf({ docDefinition });
  }
}
