import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { organizeIDsToUpdateEntity } from 'src/common/helpers/organizeIDsToUpdateEntity';
import { monthNamesES } from 'src/common/utils/monthNamesEs';
import { PrinterService } from 'src/printer/printer.service';
import { DataSource, Repository } from 'typeorm';
import { CreateWorkDto } from './dto/create-work.dto';
import { QueryParamsWork } from './dto/query-params-work.dto';
import { QueryTotalWorksInYearDto } from './dto/query-total-works-year';
import type { UpdateWorkDto } from './dto/update-work.dto';
import { WorkDetailsDto } from './dto/work-details.dto';
import { WorkDetails } from './entities/work-details.entity';
import { Work } from './entities/work.entity';
import { getWorkReport } from './reports/get-work';

@Injectable()
export class WorkService {
  private readonly logger = new Logger('WorkService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Work)
    private readonly workRepository: Repository<Work>,
    private readonly dataSource: DataSource,
    private readonly printerService: PrinterService,
  ) {}

  async create(createWorkDto: CreateWorkDto) {
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
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
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

      filter_by_total = false,
      type_filter_total,
      total,
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

    if (crop.length > 0) {
      queryBuilder.andWhere('crop.id = :cropId', { cropId: crop });
    }

    if (filter_by_date) {
      const operation =
        TypeFilterDate.AFTER == type_filter_date
          ? '>'
          : TypeFilterDate.EQUAL == type_filter_date
            ? '='
            : '<';
      queryBuilder.andWhere(`work.date ${operation} :date`, { date });
    }

    if (filter_by_total) {
      const operation =
        TypeFilterNumber.MAX == type_filter_total
          ? '>'
          : TypeFilterNumber.EQUAL == type_filter_total
            ? '='
            : '<';
      queryBuilder.andWhere(`work.total ${operation} :total`, { total });
    }

    if (employees.length > 0) {
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
    }

    const [works, count] = await queryBuilder.getManyAndCount();

    return {
      rowCount: count,
      rows: works.map((item) => ({
        ...item,
        crop: { id: item.crop.id, name: item.crop.name },
      })),
      pageCount: Math.ceil(count / limit),
    };
  }

  async findOne(id: string) {
    const work = await this.workRepository.findOne({
      withDeleted: true,
      where: { id },
      relations: { crop: true, details: { employee: true } },
    });
    if (!work)
      throw new NotFoundException(`Work register with id: ${id} not found`);
    return work;
  }

  async update(id: string, updateWorkDto: UpdateWorkDto) {
    const work = await this.findOne(id);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { details, crop, ...rest } = updateWorkDto;

      const oldDetails: WorkDetails[] = work.details;
      const newDetails: WorkDetailsDto[] = details;

      const oldIDs: string[] = oldDetails.map((record) => record.id);
      const newIDs: string[] = newDetails.map((record) =>
        new String(record.id).toString(),
      );

      const { toCreate, toUpdate, toDelete } = organizeIDsToUpdateEntity(
        newIDs,
        oldIDs,
      );

      for (const recordId of toDelete) {
        await queryRunner.manager.delete(WorkDetails, recordId);
      }

      for (const recordId of toUpdate) {
        const work = newDetails.find((item) => {
          return item.id === recordId;
        });
        const { id, ...rest } = work;
        await queryRunner.manager.update(WorkDetails, id, rest);
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
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string) {
    const work = await this.findOne(id);

    if (work.details.some((item) => item.payments_work !== null)) {
      throw new ConflictException(
        'The record cannot be deleted because it has payments linked to it.',
      );
    }
    await this.workRepository.remove(work);
  }

  async deleteAllWork() {
    try {
      await this.workRepository.delete({});
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async removeBulk(removeBulkWorksDto: RemoveBulkRecordsDto<Work>) {
    for (const { id } of removeBulkWorksDto.recordsIds) {
      await this.remove(id);
    }
  }

  async exportWorkToPDF(id: string) {
    const work = await this.findOne(id);
    const docDefinition = getWorkReport({ data: work });
    return this.printerService.createPdf(docDefinition);
  }

  async findTotalWorkInYear({
    year = 2025,
    crop = '',
    employee = '',
  }: QueryTotalWorksInYearDto) {
    const previousYear = year - 1;

    const getWorkData = async (
      year: number,
      cropId: string,
      employeeId: string,
    ) => {
      const queryBuilder = this.workRepository
        .createQueryBuilder('work')
        .leftJoin('work.crop', 'crop')
        .leftJoin('work.details', 'details')
        .leftJoin('details.employee', 'employee')
        .select([
          'CAST(EXTRACT(MONTH FROM work.date) AS INTEGER) as month',
          'CAST(SUM(DISTINCT work.total) AS INTEGER) as total',
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
              total: 0,
              quantity_works: 0,
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

      return formatData;
    };

    const currentYearData = await getWorkData(year, crop, employee);
    const previousYearData = await getWorkData(previousYear, crop, employee);

    const workDataByYear = [
      { year, data: currentYearData },
      { year: previousYear, data: previousYearData },
    ];

    return {
      years: workDataByYear,
    };
  }
}
