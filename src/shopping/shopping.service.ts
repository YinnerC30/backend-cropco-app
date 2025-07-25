import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { organizeIDsToUpdateEntity } from 'src/common/helpers';
import { getComparisonOperator } from 'src/common/helpers/get-comparison-operator';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { BaseTenantService } from 'src/common/services/base-tenant.service';
import { PrinterService } from 'src/printer/printer.service';
import { Condition } from 'src/supplies/interfaces/condition.interface';
import { SuppliesService } from 'src/supplies/supplies.service';
import { DataSource, IsNull, QueryRunner, Repository } from 'typeorm';
import { QueryParamsShopping } from './dto/query-params-shopping.dto';
import { ShoppingSuppliesDetailsDto } from './dto/shopping-supplies-details.dto';
import { ShoppingSuppliesDto } from './dto/shopping-supplies.dto';
import { SuppliesShopping, SuppliesShoppingDetails } from './entities';
import { getShoppingReport } from './reports/get-shopping';
import { UnitConversionService } from 'src/common/unit-conversion/unit-conversion.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class ShoppingService extends BaseTenantService {
  protected readonly logger = new Logger('ShoppingService');
  private suppliesShoppingRepository: Repository<SuppliesShopping>;
  private suppliesShoppingDetailsRepository: Repository<SuppliesShoppingDetails>;
  private dataSource: DataSource;

  constructor(
    @Inject(REQUEST) request: Request,
    private readonly suppliesService: SuppliesService,
    private readonly printerService: PrinterService,
    private readonly handlerError: HandlerErrorService,
    private readonly unitConversionService: UnitConversionService,
  ) {
    super(request);
    this.setLogger(this.logger);
    this.suppliesShoppingRepository =
      this.getTenantRepository(SuppliesShopping);
    this.suppliesShoppingDetailsRepository = this.getTenantRepository(
      SuppliesShoppingDetails,
    );
    this.dataSource = this.tenantConnection;
  }

  async createShoppingDetails(
    queryRunner: QueryRunner,
    data: ShoppingSuppliesDetailsDto,
  ) {
    this.logWithContext(
      `Creating shopping detail for supply: ${data.supply?.id || 'unknown'}`,
    );

    try {
      const recordToSave = queryRunner.manager.create(
        SuppliesShoppingDetails,
        data,
      );
      await queryRunner.manager.save(SuppliesShoppingDetails, recordToSave);

      this.logWithContext(
        `Shopping detail created successfully with ID: ${recordToSave.id}`,
      );

      return recordToSave;
    } catch (error) {
      this.logWithContext(
        `Failed to create shopping detail for supply: ${data.supply?.id || 'unknown'}`,
        'error',
      );
      throw error;
    }
  }

  async updateShoppingDetails(
    queryRunner: QueryRunner,
    condition: Condition,
    data: ShoppingSuppliesDetailsDto,
  ) {
    this.logWithContext(
      `Updating shopping details with condition: ${JSON.stringify(condition)}`,
    );

    try {
      const result = await queryRunner.manager.update(
        SuppliesShoppingDetails,
        condition,
        data,
      );

      this.logWithContext(
        `Shopping details updated successfully, affected rows: ${result.affected}`,
      );

      return result;
    } catch (error) {
      this.logWithContext(
        `Failed to update shopping details with condition: ${JSON.stringify(condition)}`,
        'error',
      );
      throw error;
    }
  }

  async removeShoppingDetails(queryRunner: QueryRunner, condition: Condition) {
    this.logWithContext(
      `Removing shopping details with condition: ${JSON.stringify(condition)}`,
    );

    try {
      const result = await queryRunner.manager.delete(
        SuppliesShoppingDetails,
        condition,
      );

      this.logWithContext(
        `Shopping details removed successfully, affected rows: ${result.affected}`,
      );

      return result;
    } catch (error) {
      this.logWithContext(
        `Failed to remove shopping details with condition: ${JSON.stringify(condition)}`,
        'error',
      );
      throw error;
    }
  }

  async createShopping(createShoppingSuppliesDto: ShoppingSuppliesDto) {
    this.logWithContext(
      `Creating new shopping with ${createShoppingSuppliesDto.details?.length || 0} details`,
    );

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

      this.logWithContext(
        `Shopping created successfully with ID: ${shopping.id}`,
      );

      return shopping;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logWithContext(
        `Failed to create shopping with ${createShoppingSuppliesDto.details?.length || 0} details`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async findAllShopping(queryParams: QueryParamsShopping) {
    this.logWithContext(
      `Finding all shopping with filters - suppliers: ${queryParams.suppliers?.length || 0}, supplies: ${queryParams.supplies?.length || 0}, filter_by_date: ${queryParams.filter_by_date || false}, filter_by_value_pay: ${queryParams.filter_by_value_pay || false}`,
    );

    try {
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
        .andWhere('supplies_shopping.deletedDate IS NULL')
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
            .withDeleted()
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
            .withDeleted()
            .select('sc.id')
            .from('supplies_shopping', 'sc')
            .leftJoin('sc.details', 'd')
            .leftJoin('d.supply', 's')
            .where('s.id IN (:...supplies)', { supplies })
            .getQuery();
          return 'supplies_shopping.id IN ' + subQuery;
        });

      const [shopping, count] = await queryBuilder.getManyAndCount();

      this.logWithContext(
        `Found ${shopping.length} shopping records out of ${count} total records`,
      );

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
    } catch (error) {
      this.logWithContext(
        'Failed to find shopping records with filters',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOneShopping(id: string) {
    this.logWithContext(`Finding shopping by ID: ${id}`);

    try {
      const supplyShopping = await this.suppliesShoppingRepository.findOne({
        withDeleted: true,
        where: { id, deletedDate: IsNull() },
        relations: {
          details: {
            supplier: true,
            supply: true,
          },
        },
      });

      if (!supplyShopping) {
        this.logWithContext(`Shopping with ID: ${id} not found`, 'warn');
        throw new NotFoundException(
          `Supplies Shopping with id: ${id} not found`,
        );
      }

      this.logWithContext(`Shopping found successfully with ID: ${id}`);
      return supplyShopping;
    } catch (error) {
      this.logWithContext(`Failed to find shopping with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async updateShopping(
    id: string,
    updateSuppliesShoppingDto: ShoppingSuppliesDto,
  ) {
    this.logWithContext(`Updating shopping with ID: ${id}`);

    try {
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

        this.logWithContext(
          `Shopping update operations - Create: ${toCreate.length}, Update: ${toUpdate.length}, Delete: ${toDelete.length}`,
        );

        for (const detailId of toDelete) {
          const oldRecordData: SuppliesShoppingDetails = oldDetails.find(
            (record: SuppliesShoppingDetails) => record.id === detailId,
          );

          if (oldRecordData.deletedDate !== null) {
            this.logWithContext(
              `Cannot delete shopping detail ${detailId} - linked to other records`,
              'warn',
            );
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
            !this.unitConversionService.isValidUnit(
              dataRecordNew.unit_of_measure,
            )
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
            this.logWithContext(
              `Cannot update shopping detail ${detailId} - linked to other records`,
              'warn',
            );
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
            !this.unitConversionService.isValidUnit(
              newRecordData.unit_of_measure,
            )
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
          } as SuppliesShoppingDetails);

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

        this.logWithContext(`Shopping updated successfully with ID: ${id}`);

        return await this.findOneShopping(id);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logWithContext(`Failed to update shopping with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeShopping(id: string) {
    this.logWithContext(`Attempting to remove shopping with ID: ${id}`);

    try {
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

        await queryRunner.manager.softRemove(shoppingSupply);

        await queryRunner.commitTransaction();
        this.logWithContext(`Shopping with ID: ${id} removed successfully`);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logWithContext(`Failed to remove shopping with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulkShopping(
    removeBulkShoppingDto: RemoveBulkRecordsDto<SuppliesShopping>,
  ) {
    this.logWithContext(
      `Starting bulk removal of ${removeBulkShoppingDto.recordsIds.length} shopping records`,
    );

    try {
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

      this.logWithContext(
        `Bulk removal completed. Success: ${success.length}, Failed: ${failed.length}`,
      );

      return { success, failed };
    } catch (error) {
      this.logWithContext(
        'Failed to execute bulk removal of shopping records',
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async deleteAllShoppingSupplies() {
    this.logWithContext(
      'Deleting ALL shopping supplies - this is a destructive operation',
      'warn',
    );

    try {
      await this.suppliesShoppingRepository.delete({});
      this.logWithContext('All shopping supplies deleted successfully');
    } catch (error) {
      this.logWithContext('Failed to delete all shopping supplies', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async exportShoppingToPDF(id: string, subdomain: string) {
    this.logWithContext(`Exporting shopping to PDF for ID: ${id}`);

    try {
      const shopping = await this.findOneShopping(id);
      const docDefinition = getShoppingReport({ data: shopping, subdomain });
      const pdfDoc = this.printerService.createPdf({
        docDefinition,
        title: 'Registro de compra',
        keywords: 'report-shopping',
      });

      this.logWithContext(`Shopping PDF exported successfully for ID: ${id}`);
      return pdfDoc;
    } catch (error) {
      this.logWithContext(
        `Failed to export shopping PDF for ID: ${id}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }
}
