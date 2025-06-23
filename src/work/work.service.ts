import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { organizeIDsToUpdateEntity } from 'src/common/helpers/organize-ids-to-update-entity';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { BaseTenantService } from 'src/common/services/base-tenant.service';
import { monthNamesES } from 'src/common/utils/monthNamesEs';
import { PrinterService } from 'src/printer/printer.service';
import { DataSource, Repository } from 'typeorm';
import { WorkDetailsDto } from './dto/work-details.dto';
import { WorkDto } from './dto/work.dto';

import { QueryParamsWork } from './dto/query-params-work.dto';
import { WorkDetails } from './entities/work-details.entity';
import { Work } from './entities/work.entity';
import { getWorkReport } from './reports/get-work';
import { getComparisonOperator } from 'src/common/helpers/get-comparison-operator';
import { QueryTotalWorksInYearDto } from './dto/query-params-total-works-year';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class WorkService extends BaseTenantService {
  protected readonly logger = new Logger('WorkService');
  private workRepository: Repository<Work>;
  private dataSource: DataSource;

  constructor(
    @Inject(REQUEST) request: Request,
    private readonly printerService: PrinterService,
    private readonly handlerError: HandlerErrorService,
  ) {
    super(request);
    this.setLogger(this.logger);
    this.workRepository = this.getTenantRepository(Work);
    this.dataSource = this.tenantConnection;
  }

  async create(createWorkDto: WorkDto) {
    this.logWithContext(
      `Creating new work with ${createWorkDto.details?.length || 0} details`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { details, ...rest } = createWorkDto;

      const work = queryRunner.manager.create(Work, rest);

      work.details = details.map((workDetails: WorkDetailsDto) => {
        return queryRunner.manager.create(WorkDetails, workDetails);
      });

      const savedWork = await queryRunner.manager.save(work);
      await queryRunner.commitTransaction();

      this.logWithContext(
        `Work created successfully with ID: ${savedWork.id}`,
      );

      return savedWork;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logWithContext(
        `Failed to create work with ${createWorkDto.details?.length || 0} details`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(queryParams: QueryParamsWork) {
    this.logWithContext(
      `Finding all works with filters - crop: ${queryParams.crop || 'any'}, employees: ${queryParams.employees?.length || 0}, filter_by_date: ${queryParams.filter_by_date || false}, filter_by_value_pay: ${queryParams.filter_by_value_pay || false}`,
    );

    try {
      const {
        limit = 10,
        offset = 0,
        crop = '',
        filter_by_date = false,
        type_filter_date,
        date,
        filter_by_value_pay = false,
        type_filter_value_pay,
        value_pay,
        employees = [],
      } = queryParams;

      const queryBuilder = this.workRepository
        .createQueryBuilder('work')
        .withDeleted()
        .leftJoinAndSelect('work.crop', 'crop')
        .leftJoinAndSelect('work.details', 'details')
        .leftJoinAndSelect('details.employee', 'employee')
        .orderBy('work.date', 'DESC')
        .take(limit)
        .skip(offset * limit);

      crop.length > 0 &&
        queryBuilder.andWhere('crop.id = :cropId', { cropId: crop });

      filter_by_date &&
        queryBuilder.andWhere(
          `work.date ${getComparisonOperator(type_filter_date)} :date`,
          { date },
        );

      filter_by_value_pay &&
        queryBuilder.andWhere(
          `work.value_pay ${getComparisonOperator(type_filter_value_pay)} :value_pay`,
          { value_pay },
        );

      employees.length > 0 &&
        queryBuilder.andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('work.id')
            .from('works', 'work')
            .leftJoin('work.details', 'details')
            .leftJoin('details.employee', 'employee')
            .where('employee.id IN (:...employees)', { employees })
            .getQuery();
          return 'work.id IN ' + subQuery;
        });

      const [works, count] = await queryBuilder.getManyAndCount();

      this.logWithContext(`Found ${works.length} works out of ${count} total works`);

      if (works.length === 0 && count > 0) {
        throw new NotFoundException(
          'There are no work records with the requested pagination',
        );
      }

      return {
        total_row_count: count,
        current_row_count: works.length,
        total_page_count: Math.ceil(count / limit),
        current_page_count: works.length > 0 ? offset + 1 : 0,
        records: works,
      };
    } catch (error) {
      this.logWithContext('Failed to find works with filters', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async findOne(id: string) {
    this.logWithContext(`Finding work by ID: ${id}`);

    try {
      const work = await this.workRepository.findOne({
        withDeleted: true,
        where: { id },
        relations: {
          crop: true,
          details: { employee: true, payments_work: true },
        },
      });

      if (!work) {
        this.logWithContext(`Work with ID: ${id} not found`, 'warn');
        throw new NotFoundException(`Work with id: ${id} not found`);
      }

      this.logWithContext(`Work found successfully with ID: ${id}`);
      return work;
    } catch (error) {
      this.logWithContext(`Failed to find work with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async update(id: string, updateWorkDto: WorkDto) {
    this.logWithContext(`Updating work with ID: ${id}`);

    try {
      const work = await this.findOne(id);

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const { details, crop, ...rest } = updateWorkDto;

        const oldDetails: WorkDetails[] = work.details;
        const newDetails: WorkDetailsDto[] = updateWorkDto.details ?? [];

        const oldIDs: string[] = oldDetails.map((record) => record.id);
        const newIDs: string[] = newDetails.map((record) =>
          new String(record.id).toString(),
        );

        const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
          newIDs,
          oldIDs,
        );

        this.logWithContext(
          `Work update operations - Create: ${toCreate.length}, Update: ${toUpdate.length}, Delete: ${toDelete.length}`,
        );

        for (const recordId of toDelete) {
          const dataRecordOld = oldDetails.find(
            (record) => record.id === recordId,
          );

          if (dataRecordOld.payment_is_pending === false) {
            this.logWithContext(
              `Cannot delete work detail ${recordId} - linked to payment`,
              'warn',
            );
            throw new BadRequestException(
              `You cannot delete the record with id ${recordId} , it is linked to a payment record.`,
            );
          }

          if (dataRecordOld.deletedDate !== null) {
            this.logWithContext(
              `Cannot delete work detail ${recordId} - linked to other records`,
              'warn',
            );
            throw new BadRequestException(
              `You cannot delete the record with id ${recordId} , it is linked to other records.`,
            );
          }
          await queryRunner.manager.delete(WorkDetails, recordId);
        }

        for (const recordId of toUpdate) {
          const dataRecordNew = newDetails.find(
            (record) => record.id === recordId,
          );
          const dataRecordOld = oldDetails.find(
            (record) => record.id === recordId,
          );

          const valuesAreDifferent =
            dataRecordNew.value_pay !== dataRecordOld.value_pay;

          if (valuesAreDifferent) {
            switch (true) {
              case dataRecordOld.payment_is_pending === false:
                this.logWithContext(
                  `Cannot update work detail ${recordId} - linked to payment`,
                  'warn',
                );
                throw new BadRequestException(
                  `You cannot update the record with id ${recordId} , it is linked to a payment record.`,
                );
              case dataRecordOld.deletedDate !== null:
                this.logWithContext(
                  `Cannot update work detail ${recordId} - linked to other records`,
                  'warn',
                );
                throw new BadRequestException(
                  `You cannot update the record with id ${recordId} , it is linked to other records.`,
                );
            }
          }
          await queryRunner.manager.update(
            WorkDetails,
            { id: recordId },
            dataRecordNew,
          );
        }

        for (const recordId of toCreate) {
          const { id: idWorkDetail, ...rest } = newDetails.find((item) => {
            return item.id === recordId;
          });
          const recordToCreate = queryRunner.manager.create(WorkDetails, {
            ...rest,
            work: { id },
          });
          await queryRunner.manager.save(WorkDetails, recordToCreate);
        }

        await queryRunner.manager.update(Work, id, rest);
        await queryRunner.commitTransaction();

        this.logWithContext(`Work updated successfully with ID: ${id}`);

        return this.findOne(id);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logWithContext(`Failed to update work with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async remove(id: string) {
    this.logWithContext(`Attempting to remove work with ID: ${id}`);

    try {
      const work = await this.findOne(id);

      if (work.details.some((item) => item.payments_work !== null)) {
        this.logWithContext(
          `Cannot remove work with ID: ${id} - has payments linked`,
          'warn',
        );
        throw new ConflictException(
          `The record with id ${id} cannot be deleted because it has payments linked to it.`,
        );
      }

      await this.workRepository.remove(work);
      this.logWithContext(`Work with ID: ${id} removed successfully`);
    } catch (error) {
      this.logWithContext(`Failed to remove work with ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async deleteAllWork() {
    this.logWithContext(
      'Deleting ALL works - this is a destructive operation',
      'warn',
    );

    try {
      await this.workRepository.delete({});
      this.logWithContext('All works deleted successfully');
    } catch (error) {
      this.logWithContext('Failed to delete all works', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async removeBulk(removeBulkWorksDto: RemoveBulkRecordsDto<Work>) {
    this.logWithContext(
      `Starting bulk removal of ${removeBulkWorksDto.recordsIds.length} works`,
    );

    try {
      const success: string[] = [];
      const failed: { id: string; error: string }[] = [];

      for (const { id } of removeBulkWorksDto.recordsIds) {
        try {
          await this.remove(id);
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
      this.logWithContext('Failed to execute bulk removal of works', 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async exportWorkToPDF(id: string, subdomain: string) {
    this.logWithContext(`Exporting work to PDF for ID: ${id}`);

    try {
      const work = await this.findOne(id);
      const docDefinition = getWorkReport({ data: work, subdomain });
      const pdfDoc = this.printerService.createPdf({
        docDefinition,
        title: 'Registro de trabajo',
        keywords: 'report-work',
      });

      this.logWithContext(`Work PDF exported successfully for ID: ${id}`);
      return pdfDoc;
    } catch (error) {
      this.logWithContext(`Failed to export work PDF for ID: ${id}`, 'error');
      this.handlerError.handle(error, this.logger);
    }
  }

  async getWorkData(year: number, cropId: string, employeeId: string) {
    this.logWithContext(
      `Getting work data for year: ${year}, crop: ${cropId || 'any'}, employee: ${employeeId || 'any'}`,
    );

    try {
      const queryBuilder = this.workRepository
        .createQueryBuilder('work')
        .leftJoin('work.crop', 'crop')
        .leftJoin('work.details', 'details')
        .leftJoin('details.employee', 'employee')
        .select([
          'CAST(EXTRACT(MONTH FROM work.date) AS INTEGER) as month',
          'CAST(SUM(DISTINCT details.value_pay) AS INTEGER) as value_pay',
          'COUNT(work) as quantity_works',
        ])
        .where('EXTRACT(YEAR FROM work.date) = :year', { year })
        .groupBy('EXTRACT(MONTH FROM work.date)')
        .orderBy('month', 'ASC');

      if (cropId) {
        queryBuilder.andWhere('crop.id = :cropId', { cropId });
      }
      if (employeeId) {
        queryBuilder.andWhere('employee.id = :employeeId', { employeeId });
      }

      const rawData = await queryBuilder.getRawMany();

      const formatData = monthNamesES.map((monthName: string, index: number) => {
        const monthNumber = index + 1;
        const record = rawData.find((item) => {
          return item.month === monthNumber;
        });

        if (!record) {
          return {
            month_name: monthName,
            month_number: monthNumber,
            value_pay: 0,
            quantity_works: 0,
          };
        }

        delete record.month;

        return {
          ...record,
          month_name: monthName,
          month_number: monthNumber,
        };
      });

      this.logWithContext(
        `Work data retrieved successfully for year: ${year}, ${rawData.length} months with data`,
      );

      return formatData;
    } catch (error) {
      this.logWithContext(`Failed to get work data for year: ${year}`, 'error');
      throw error;
    }
  }

  async findTotalWorkInYear({
    year = new Date().getFullYear(),
    cropId = '',
    employeeId = '',
  }: QueryTotalWorksInYearDto) {
    this.logWithContext(
      `Finding total work in year: ${year} with crop: ${cropId || 'any'}, employee: ${employeeId || 'any'}`,
    );

    try {
      const previousYear = year - 1;

      const currentYearData = await this.getWorkData(year, cropId, employeeId);
      const previousYearData = await this.getWorkData(
        previousYear,
        cropId,
        employeeId,
      );

      const workDataByYear = [
        { year, data: currentYearData },
        { year: previousYear, data: previousYearData },
      ];

      this.logWithContext(
        `Total work data calculated successfully for year: ${year}`,
      );

      return {
        years: workDataByYear,
      };
    } catch (error) {
      this.logWithContext(
        `Failed to find total work in year: ${year}`,
        'error',
      );
      this.handlerError.handle(error, this.logger);
    }
  }
}
