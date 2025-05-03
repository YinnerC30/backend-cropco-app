import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { organizeIDsToUpdateEntity } from 'src/common/helpers/organize-ids-to-update-entity';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
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

@Injectable()
export class WorkService {
  private readonly logger = new Logger('WorkService');

  constructor(
    @InjectRepository(Work)
    private readonly workRepository: Repository<Work>,
    private readonly dataSource: DataSource,
    private readonly printerService: PrinterService,
    private readonly handlerError: HandlerErrorService,
  ) {
    this.handlerError.setLogger(this.logger);
  }

  async create(createWorkDto: WorkDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { details, ...rest } = createWorkDto;

      const work = queryRunner.manager.create(Work, rest);

      work.details = details.map((workDetails: WorkDetailsDto) => {
        return queryRunner.manager.create(WorkDetails, workDetails);
      });

      await queryRunner.manager.save(work);

      await queryRunner.commitTransaction();
      return work;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(queryParams: QueryParamsWork) {
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
  }

  async findOne(id: string) {
    const work = await this.workRepository.findOne({
      withDeleted: true,
      where: { id },
      relations: {
        crop: true,
        details: { employee: true, payments_work: true },
      },
    });
    if (!work) throw new NotFoundException(`Work with id: ${id} not found`);
    return work;
  }

  async update(id: string, updateWorkDto: WorkDto) {
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

      for (const recordId of toDelete) {
        const dataRecordOld = oldDetails.find(
          (record) => record.id === recordId,
        );

        if (dataRecordOld.payment_is_pending === false) {
          throw new BadRequestException(
            `You cannot delete the record with id ${recordId} , it is linked to a payment record.`,
          );
        }

        if (dataRecordOld.deletedDate !== null) {
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
              throw new BadRequestException(
                `You cannot update the record with id ${recordId} , it is linked to a payment record.`,
              );
            case dataRecordOld.deletedDate !== null:
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
      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error);
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string) {
    const work = await this.findOne(id);

    if (work.details.some((item) => item.payments_work !== null)) {
      throw new ConflictException(
        `The record with id ${id} cannot be deleted because it has payments linked to it.`,
      );
    }
    await this.workRepository.remove(work);
  }

  async deleteAllWork() {
    try {
      await this.workRepository.delete({});
    } catch (error) {
      this.handlerError.handle(error);
    }
  }

  async removeBulk(removeBulkWorksDto: RemoveBulkRecordsDto<Work>) {
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

    return { success, failed };
  }

  async exportWorkToPDF(id: string) {
    const work = await this.findOne(id);
    const docDefinition = getWorkReport({ data: work });
    return this.printerService.createPdf({ docDefinition });
  }

  async getWorkData(year: number, cropId: string, employeeId: string) {
    const queryBuilder = this.workRepository
      .createQueryBuilder('work')
      .leftJoin('work.crop', 'crop')
      .leftJoin('work.details', 'details')
      .leftJoin('details.employee', 'employee')
      .select([
        'CAST(EXTRACT(MONTH FROM work.date) AS INTEGER) as month',
        'CAST(SUM(DISTINCT work.value_pay) AS INTEGER) as value_pay',
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

    return formatData;
  }

  async findTotalWorkInYear({
    year = 2025,
    cropId = '',
    employeeId = '',
  }: QueryTotalWorksInYearDto) {
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

    return {
      years: workDataByYear,
    };
  }
}
