import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { organizeIDsToUpdateEntity } from 'src/common/helpers/organize-ids-to-update-entity';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { BaseTenantService } from 'src/common/services/base-tenant.service';
import { monthNamesES } from 'src/common/utils/monthNamesEs';
import { HarvestService } from 'src/harvest/harvest.service';
import { PrinterService } from 'src/printer/printer.service';
import { DataSource, Repository } from 'typeorm';
import { QueryParamsSale } from './dto/query-params-sale.dto';
import { QueryTotalSalesInYearDto } from './dto/query-total-sales-year';
import { SaleDetailsDto } from './dto/sale-details.dto';
import { SaleDto } from './dto/sale.dto';
import { SaleDetails } from './entities/sale-details.entity';
import { Sale } from './entities/sale.entity';
import { getSaleReport } from './reports/get-sale';
import { getComparisonOperator } from 'src/common/helpers/get-comparison-operator';
import { UnitConversionService } from 'src/common/unit-conversion/unit-conversion.service';

@Injectable()
export class SalesService extends BaseTenantService {
  protected logger = new Logger('SalesService');
  private saleRepository: Repository<Sale>;

  constructor(
    @Inject(REQUEST) request: Request,
    private readonly harvestService: HarvestService,
    private readonly printerService: PrinterService,
    private readonly handlerError: HandlerErrorService,
    private readonly unitConversionService: UnitConversionService,
  ) {
    super(request);
    this.setLogger(this.logger);
    this.saleRepository = this.getTenantRepository(Sale);
  }

  async create(createSaleDto: SaleDto) {
    this.logWithContext(
      `Iniciando creación de venta: ${JSON.stringify(createSaleDto)}`,
    );

    const queryRunner = this.tenantConnection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logWithContext('Transacción iniciada para crear venta');

      const { details, ...rest } = createSaleDto;
      const sale = queryRunner.manager.create(Sale, rest);

      sale.details = details.map((saleDetails: SaleDetailsDto) => {
        return queryRunner.manager.create(SaleDetails, saleDetails);
      });

      this.logWithContext(
        `Procesando detalles de venta y actualizando stock. Detalles: ${details.length}`,
      );

      for (const item of details) {
        const amountConverted = this.unitConversionService.convert(
          item.amount,
          item.unit_of_measure,
          'GRAMOS',
        );

        this.logWithContext(
          `Actualizando stock de cosecha para venta - Cultivo: ${item.crop.id}, Cantidad: ${item.amount} ${item.unit_of_measure}, Convertido: ${amountConverted}g`,
        );

        await this.harvestService.updateStock(queryRunner, {
          cropId: item.crop.id,
          amount: amountConverted,
          type_update: 'decrement',
        });
      }

      const totalAmountInGrams = details.reduce((total, detail) => {
        const amountInGrams = this.unitConversionService.convert(
          detail.amount,
          detail.unit_of_measure,
          'GRAMOS',
        );
        return total + amountInGrams;
      }, 0);

      sale.amount = totalAmountInGrams;

      await queryRunner.manager.save(sale);
      await queryRunner.commitTransaction();

      this.logWithContext(
        `Venta creada exitosamente - ID: ${sale.id}, Total: ${totalAmountInGrams}g, Detalles: ${details.length}`,
      );

      return sale;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logWithContext(`Error al crear venta: ${error.message}`, 'error');
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
      this.logWithContext('Transacción liberada');
    }
  }

  async findAll(queryParams: QueryParamsSale) {
    this.logWithContext(
      `Buscando ventas con parámetros: ${JSON.stringify(queryParams)}`,
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

        filter_by_amount = false,
        type_filter_amount,
        type_unit_of_measure = 'KILOGRAMOS',
        amount,

        filter_by_is_receivable = false,
        is_receivable,

        clients = [],
        crops = [],
      } = queryParams;

      const queryBuilder = this.saleRepository
        .createQueryBuilder('sale')
        .withDeleted()
        .leftJoinAndSelect('sale.details', 'details')
        .leftJoinAndSelect('details.client', 'client')
        .leftJoinAndSelect('details.crop', 'crop')
        .orderBy('sale.date', 'DESC')
        .take(limit)
        .skip(offset * limit);

      filter_by_date &&
        queryBuilder.andWhere(
          `sale.date ${getComparisonOperator(type_filter_date)} :date`,
          { date },
        );

      const amountConverted = this.unitConversionService.convert(
        amount,
        type_unit_of_measure,
        'GRAMOS',
      );

      filter_by_amount &&
        queryBuilder.andWhere(
          `sale.amount ${getComparisonOperator(type_filter_amount)} :amount`,
          { amount: amountConverted },
        );

      filter_by_value_pay &&
        queryBuilder.andWhere(
          `sale.value_pay ${getComparisonOperator(type_filter_value_pay)} :value_pay`,
          {
            value_pay,
          },
        );

      clients.length > 0 &&
        queryBuilder.andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('sale.id')
            .from('sales', 'sale')
            .leftJoin('sale.details', 'details')
            .leftJoin('details.client', 'client')
            .where('client.id IN (:...clients)', { clients })
            .getQuery();
          return 'sale.id IN ' + subQuery;
        });

      crops.length > 0 &&
        queryBuilder.andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('sale.id')
            .from('sales', 'sale')
            .leftJoin('sale.details', 'details')
            .leftJoin('details.crop', 'crop')
            .where('crop.id IN (:...crops)', { crops })
            .getQuery();
          return 'sale.id IN ' + subQuery;
        });

      filter_by_is_receivable &&
        queryBuilder.andWhere(`sale.is_receivable = :is_receivable`, {
          is_receivable,
        });

      const [sales, count] = await queryBuilder.getManyAndCount();

      if (sales.length === 0 && count > 0) {
        this.logWithContext(
          `No se encontraron ventas para la paginación solicitada - Offset: ${offset}, Limit: ${limit}, Total: ${count}`,
          'warn',
        );
        throw new NotFoundException(
          'There are no sale records with the requested pagination',
        );
      }

      this.logWithContext(
        `Ventas encontradas exitosamente - Total: ${count}, Retornadas: ${sales.length}, Página: ${offset + 1}, Filtros aplicados: fecha(${filter_by_date}), valor(${filter_by_value_pay}), cantidad(${filter_by_amount}), por_cobrar(${filter_by_is_receivable}), clientes(${clients.length}), cultivos(${crops.length})`,
      );

      return {
        total_row_count: count,
        current_row_count: sales.length,
        total_page_count: Math.ceil(count / limit),
        current_page_count: sales.length > 0 ? offset + 1 : 0,
        records: sales,
      };
    } catch (error) {
      this.logWithContext(`Error al buscar ventas: ${error.message}`, 'error');
      throw error;
    }
  }

  async findOne(id: string) {
    this.logWithContext(`Buscando venta por ID: ${id}`);

    try {
      const sale = await this.saleRepository.findOne({
        withDeleted: true,
        where: {
          id,
        },
        relations: {
          details: {
            client: true,
            crop: true,
          },
        },
      });

      if (!sale) {
        this.logWithContext(`Venta no encontrada con ID: ${id}`, 'warn');
        throw new NotFoundException(`Sale with id: ${id} not found`);
      }

      this.logWithContext(
        `Venta encontrada exitosamente - ID: ${id}, Detalles: ${sale.details?.length || 0}, Cantidad: ${sale.amount}g`,
      );

      return sale;
    } catch (error) {
      this.logWithContext(
        `Error al buscar venta con ID ${id}: ${error.message}`,
        'error',
      );
      throw error;
    }
  }

  async update(id: string, updateSaleDto: SaleDto) {
    this.logWithContext(
      `Iniciando actualización de venta - ID: ${id}, Datos: ${JSON.stringify(updateSaleDto)}`,
    );

    try {
      const sale: Sale = await this.findOne(id);

      const queryRunner = this.tenantConnection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        this.logWithContext(
          `Transacción iniciada para actualizar venta con ID: ${id}`,
        );

        const { details, ...rest } = updateSaleDto;

        const oldDetails: SaleDetails[] = sale.details;
        const newDetails: SaleDetailsDto[] = details;

        const oldIDsHarvestDetails: string[] = oldDetails.map(
          (record) => record.id,
        );
        const newIDsHarvestDetails: string[] = newDetails.map((record) =>
          new String(record.id).toString(),
        );

        const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
          newIDsHarvestDetails,
          oldIDsHarvestDetails,
        );

        this.logWithContext(
          `Organizando cambios en detalles de venta - Crear: ${toCreate.length}, Actualizar: ${toUpdate.length}, Eliminar: ${toDelete.length}`,
        );

        for (const saleDetailId of toDelete) {
          const oldData = oldDetails.find(
            (record) => record.id === saleDetailId,
          );

          if (oldData.deletedDate !== null) {
            this.logWithContext(
              `Intento de eliminar detalle vinculado a otros registros - ID: ${saleDetailId}`,
              'warn',
            );
            throw new BadRequestException(
              `You cannot delete the record with id ${saleDetailId} , it is linked to other records.`,
            );
          }

          const amountConverted = this.unitConversionService.convert(
            oldData.amount,
            oldData.unit_of_measure,
            'GRAMOS',
          );

          this.logWithContext(
            `Restaurando stock por eliminación de detalle - ID: ${saleDetailId}, Cultivo: ${oldData.crop.id}, Cantidad: ${oldData.amount} ${oldData.unit_of_measure}, Convertido: ${amountConverted}g`,
          );

          await this.harvestService.updateStock(queryRunner, {
            cropId: oldData.crop.id,
            amount: amountConverted,
            type_update: 'increment',
          });

          await queryRunner.manager.delete(SaleDetails, { id: saleDetailId });
        }

        for (const saleDetailId of toUpdate) {
          const oldRecordData = oldDetails.find(
            (record) => record.id === saleDetailId,
          );
          const dataRecordNew = newDetails.find(
            (record) => record.id === saleDetailId,
          );

          const valuesAreDifferent =
            dataRecordNew.value_pay !== oldRecordData.value_pay ||
            dataRecordNew.amount !== oldRecordData.amount;

          if (valuesAreDifferent && oldRecordData.deletedDate !== null) {
            this.logWithContext(
              `Intento de actualizar detalle vinculado a otros registros - ID: ${saleDetailId}`,
              'warn',
            );
            throw new BadRequestException(
              `You cannot update the record with id ${saleDetailId} , it is linked to other records.`,
            );
          }

          this.logWithContext(
            `Actualizando detalle de venta - ID: ${saleDetailId}, Valores cambiaron: ${valuesAreDifferent}, Cantidad anterior: ${oldRecordData.amount}, Cantidad nueva: ${dataRecordNew.amount}`,
          );

          const amountConverted = this.unitConversionService.convert(
            oldRecordData.amount,
            oldRecordData.unit_of_measure,
            'GRAMOS',
          );

          await this.harvestService.updateStock(queryRunner, {
            cropId: oldRecordData.crop.id,
            amount: amountConverted,
            type_update: 'increment',
          });

          const amountConvertedNew = this.unitConversionService.convert(
            dataRecordNew.amount,
            dataRecordNew.unit_of_measure,
            'GRAMOS',
          );

          await this.harvestService.updateStock(queryRunner, {
            cropId: dataRecordNew.crop.id,
            amount: amountConvertedNew,
            type_update: 'decrement',
          });

          await queryRunner.manager.update(
            SaleDetails,
            { id: saleDetailId },
            dataRecordNew,
          );
        }

        for (const saleDetailId of toCreate) {
          const newData = newDetails.find(
            (record) => record.id === saleDetailId,
          );

          const amountConverted = this.unitConversionService.convert(
            newData.amount,
            newData.unit_of_measure,
            'GRAMOS',
          );

          this.logWithContext(
            `Creando nuevo detalle de venta - ID: ${saleDetailId}, Cultivo: ${newData.crop.id}, Cantidad: ${newData.amount} ${newData.unit_of_measure}, Convertido: ${amountConverted}g`,
          );

          await this.harvestService.updateStock(queryRunner, {
            cropId: newData.crop.id,
            amount: amountConverted,
            type_update: 'decrement',
          });

          const record = queryRunner.manager.create(SaleDetails, {
            sale: { id: sale.id },
            ...newData,
          });
          await queryRunner.manager.save(record);
        }

        const totalAmountInGrams = newDetails.reduce((total, detail) => {
          const amountInGrams = this.unitConversionService.convert(
            detail.amount,
            detail.unit_of_measure,
            'GRAMOS',
          );
          return total + amountInGrams;
        }, 0);

        await queryRunner.manager.update(
          Sale,
          { id },
          { ...rest, amount: totalAmountInGrams },
        );

        await queryRunner.commitTransaction();

        this.logWithContext(
          `Venta actualizada exitosamente - ID: ${id}, Total: ${totalAmountInGrams}g, Detalles: ${newDetails.length}`,
        );

        return await this.findOne(id);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logWithContext(
          `Error en transacción de actualización de venta - ID: ${id}: ${error.message}`,
          'error',
        );
        throw error;
      } finally {
        await queryRunner.release();
        this.logWithContext(
          `Transacción de actualización liberada para venta ID: ${id}`,
        );
      }
    } catch (error) {
      this.logWithContext(
        `Error al actualizar venta ID ${id}: ${error.message}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    this.logWithContext(`Iniciando eliminación de venta ID: ${id}`);

    try {
      const sale = await this.findOne(id);

      if (sale.details.some((item) => item.is_receivable === true)) {
        this.logWithContext(
          `Intento de eliminar venta con cuentas por cobrar - ID: ${id}, Detalles por cobrar: ${sale.details.filter((item) => item.is_receivable).length}`,
          'warn',
        );
        throw new ConflictException(
          `The record with id ${sale.id} cannot be deleted because it has unpaid sales`,
        );
      }

      const queryRunner = this.tenantConnection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        this.logWithContext(
          `Transacción iniciada para eliminar venta ID: ${id}`,
        );

        const { details } = sale;

        this.logWithContext(
          `Restaurando stock por eliminación de venta - Detalles: ${details.length}`,
        );

        for (const item of details) {
          if (item.crop.deletedDate !== null) {
            this.logWithContext(
              `Saltando restauración de stock para cultivo eliminado - Cultivo ID: ${item.crop.id}`,
            );
            continue;
          }

          const amountConverted = this.unitConversionService.convert(
            item.amount,
            item.unit_of_measure,
            'GRAMOS',
          );

          this.logWithContext(
            `Restaurando stock de cultivo - Cultivo: ${item.crop.id}, Cantidad: ${item.amount} ${item.unit_of_measure}, Convertido: ${amountConverted}g`,
          );

          await this.harvestService.updateStock(queryRunner, {
            cropId: item.crop.id,
            amount: amountConverted,
            type_update: 'increment',
          });
        }

        await queryRunner.manager.remove(Sale, sale);
        await queryRunner.commitTransaction();

        this.logWithContext(`Venta eliminada exitosamente - ID: ${id}`);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logWithContext(
          `Error en transacción de eliminación de venta ID ${id}: ${error.message}`,
          'error',
        );
        throw error;
      } finally {
        await queryRunner.release();
        this.logWithContext(
          `Transacción de eliminación liberada para venta ID: ${id}`,
        );
      }
    } catch (error) {
      this.logWithContext(
        `Error al eliminar venta ID ${id}: ${error.message}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async deleteAllSales() {
    this.logWithContext(
      'Iniciando eliminación masiva de todas las ventas',
      'warn',
    );

    try {
      const result = await this.saleRepository.delete({});
      this.logWithContext(
        `Eliminación masiva de ventas completada - Filas afectadas: ${result.affected}`,
        'warn',
      );
    } catch (error) {
      this.logWithContext(
        `Error en eliminación masiva de ventas: ${error.message}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulk(removeBulkSalesDto: RemoveBulkRecordsDto<Sale>) {
    this.logWithContext(
      `Iniciando eliminación masiva de ventas - Registros: ${removeBulkSalesDto.recordsIds.length}`,
    );

    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const { id } of removeBulkSalesDto.recordsIds) {
      try {
        await this.remove(id);
        success.push(id);
        this.logWithContext(`Venta eliminada en lote exitosamente - ID: ${id}`);
      } catch (error) {
        failed.push({ id, error: error.message });
        this.logWithContext(
          `Error al eliminar venta en lote ID ${id}: ${error.message}`,
          'error',
        );
      }
    }

    this.logWithContext(
      `Eliminación masiva de ventas completada - Exitosos: ${success.length}, Fallidos: ${failed.length}`,
    );

    return { success, failed };
  }

  async exportSaleToPDF(id: string, subdomain: string) {
    this.logWithContext(
      `Iniciando exportación de venta a PDF - ID: ${id}, Subdominio: ${subdomain}`,
    );

    try {
      const sale = await this.findOne(id);

      const docDefinition = getSaleReport({
        data: {
          ...sale,
          amount: this.unitConversionService.convert(
            sale.amount,
            'GRAMOS',
            'KILOGRAMOS',
          ),
        },
        subdomain,
      });

      const pdfDoc = this.printerService.createPdf({
        docDefinition,
        title: 'Registro de venta',
        keywords: 'report-sale',
      });

      this.logWithContext(
        `PDF de venta generado exitosamente - ID: ${id}, Subdominio: ${subdomain}, Cantidad en Kg: ${this.unitConversionService.convert(sale.amount, 'GRAMOS', 'KILOGRAMOS')}`,
      );

      return pdfDoc;
    } catch (error) {
      this.logWithContext(
        `Error al exportar venta a PDF - ID: ${id}, Subdominio: ${subdomain}: ${error.message}`,
        'error',
      );
      throw error;
    }
  }

  async findTotalSalesInYear({
    year = new Date().getFullYear(),
    cropId = '',
    clientId = '',
  }: QueryTotalSalesInYearDto) {
    this.logWithContext(
      `Buscando datos de ventas por año - Año: ${year}, Cultivo: ${cropId || 'all'}, Cliente: ${clientId || 'all'}`,
    );

    try {
      const previousYear = year - 1;

      const getHarvestData = async (
        year: number,
        cropId: string,
        clientId: string,
      ) => {
        this.logWithContext(
          `Obteniendo datos de ventas para año específico - Año: ${year}, Cultivo: ${cropId || 'all'}, Cliente: ${clientId || 'all'}`,
        );

        const queryBuilder = this.saleRepository
          .createQueryBuilder('sale')
          .leftJoin('sale.details', 'details')
          .leftJoin('details.crop', 'crop')
          .leftJoin('details.client', 'client')
          .select([
            'CAST(EXTRACT(MONTH FROM sale.date) AS INTEGER) as month',
            'CAST(SUM(DISTINCT details.value_pay) AS INTEGER) as value_pay',
            'CAST(SUM(DISTINCT details.amount) AS INTEGER) as amount',
          ])
          .where('EXTRACT(YEAR FROM sale.date) = :year', { year })
          .groupBy('EXTRACT(MONTH FROM sale.date)')
          .orderBy('month', 'ASC');

        if (cropId) {
          queryBuilder.andWhere('crop.id = :cropId', { cropId });
        }
        if (clientId) {
          queryBuilder.andWhere('client.id = :clientId', { clientId });
        }

        const rawData = await queryBuilder.getRawMany();

        const formatData = monthNamesES.map(
          (monthName: string, index: number) => {
            const monthNumber = index + 1;
            const record = rawData.find((item) => {
              return item.month === monthNumber;
            });

            if (!record) {
              return {
                month_name: monthName,
                month_number: monthNumber,
                value_pay: 0,
                amount: 0,
              };
            }

            delete record.month;

            return {
              ...record,
              month_name: monthName,
              month_number: monthNumber,
            };
          },
        );

        this.logWithContext(
          `Datos de ventas formateados para el año - Año: ${year}, Meses con datos: ${rawData.length}, Total meses: 12`,
        );

        return formatData;
      };

      const currentYearData = await getHarvestData(year, cropId, clientId);
      const previousYearData = await getHarvestData(
        previousYear,
        cropId,
        clientId,
      );

      const saleDataByYear = [
        { year, data: currentYearData },
        { year: previousYear, data: previousYearData },
      ];

      this.logWithContext(
        `Datos de ventas anuales obtenidos exitosamente - Año actual: ${year}, Año anterior: ${previousYear}, Cultivo: ${cropId || 'all'}, Cliente: ${clientId || 'all'}`,
      );

      return {
        years: saleDataByYear,
      };
    } catch (error) {
      this.logWithContext(
        `Error al obtener datos de ventas anuales - Año: ${year}, Cultivo: ${cropId || 'all'}, Cliente: ${clientId || 'all'}: ${error.message}`,
        'error',
      );
      throw error;
    }
  }
}
