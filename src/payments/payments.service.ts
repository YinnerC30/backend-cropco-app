import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryParams } from 'src/common/dto/QueryParams';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { HarvestService } from 'src/harvest/harvest.service';
import { WorkDetails } from 'src/work/entities/work-details.entity';
import { WorkService } from 'src/work/work.service';
import { DataSource, Repository } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentHarvest } from './entities/payment-harvest.entity';
import { PaymentWork } from './entities/payment-work.entity';
import { MethodOfPayment, Payment } from './entities/payment.entity';
import { QueryParamsPayment } from './dto/query-params-payment.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { PrinterService } from 'src/printer/printer.service';
import { getPaymentReport } from './reports/get-payment';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private printerService: PrinterService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const { harvests, works } = createPaymentDto.categories;

    const totalValuePayHarvest = [];

    for (const id of harvests) {
      const record = await queryRunner.manager
        .getRepository(HarvestDetails)
        .findOne({ where: { id: `${id}` } });

      if (!record) {
        throw new BadRequestException(
          'No existe el registro de  harvest detail',
        );
      }
      totalValuePayHarvest.push(record.value_pay);
    }

    const totalValuePayWork = [];

    for (const id of works) {
      const record = await queryRunner.manager
        .getRepository(WorkDetails)
        .findOne({ where: { id: `${id}` } });
      totalValuePayWork.push(record.value_pay);
    }

    const totalVerify: number = [
      ...totalValuePayHarvest,
      ...totalValuePayWork,
    ].reduce((accumulator, currentValue) => accumulator + currentValue, 0);

    if (totalVerify !== createPaymentDto.total) {
      throw new BadRequestException(
        `Total payment is not correct, correct value is ${totalVerify}`,
      );
    }
    try {
      const payment: Payment = queryRunner.manager.create(
        Payment,
        createPaymentDto,
      );
      payment.payments_harvest = harvests.map((id) => {
        return queryRunner.manager.create(PaymentHarvest, {
          harvests_detail: id,
        });
      });

      payment.payments_work = works.map((id) =>
        queryRunner.manager.create(PaymentWork, { works_detail: id }),
      );

      for (const id of harvests) {
        await queryRunner.manager.update(
          HarvestDetails,
          { id },
          { payment_is_pending: false },
        );
      }

      for (const id of works) {
        await queryRunner.manager.update(
          WorkDetails,
          { id },
          { payment_is_pending: false },
        );
      }

      await queryRunner.manager.save(Payment, payment);
      await queryRunner.commitTransaction();
    } catch (error) {
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(queryParams: QueryParamsPayment) {
    const {
      limit = 10,
      offset = 0,

      employee = '',

      filter_by_date = false,
      type_filter_date,
      date,

      filter_by_total = false,
      type_filter_total,
      total,
      filter_by_method_of_payment = false,
      method_of_payment = MethodOfPayment.EFECTIVO,
    } = queryParams;

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .withDeleted()
      .leftJoinAndSelect('payment.employee', 'employee')
      .orderBy('payment.date', 'DESC')
      .take(limit)
      .skip(offset * limit);

    if (employee.length > 0) {
      queryBuilder.andWhere('employee.id = :employeeId', {
        employeeId: employee,
      });
    }

    if (filter_by_date) {
      const operation =
        TypeFilterDate.AFTER == type_filter_date
          ? '>'
          : TypeFilterDate.EQUAL == type_filter_date
            ? '='
            : '<';
      queryBuilder.andWhere(`payment.date ${operation} :date`, { date });
    }

    if (filter_by_total) {
      const operation =
        TypeFilterNumber.MAX == type_filter_total
          ? '>'
          : TypeFilterNumber.EQUAL == type_filter_total
            ? '='
            : '<';
      queryBuilder.andWhere(`payment.total ${operation} :total`, { total });
    }

    if (filter_by_method_of_payment) {
      queryBuilder.andWhere('payment.method_of_payment = :method_of_payment', {
        method_of_payment,
      });
    }

    const [payments, count] = await queryBuilder.getManyAndCount();

    return {
      rowCount: count,
      rows: payments,
      pageCount: Math.ceil(count / limit),
    };
  }

  async findOne(id: string) {
    const payment = await this.paymentRepository.findOne({
      withDeleted: true,
      where: {
        id,
      },
      relations: {
        employee: true,
        payments_harvest: {
          harvests_detail: {
            harvest: true,
          },
        },
        payments_work: {
          works_detail: {
            work: true,
          },
        },
      },
    });
    if (!payment)
      throw new NotFoundException(`Payment with id: ${id} not found`);
    return payment;
  }

  async remove(id: string) {
    const payment = await this.findOne(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.delete(Payment, { id });

      const { payments_harvest, payments_work } = payment;

      for (const record of payments_harvest) {
        const { id } = record.harvests_detail;
        await queryRunner.manager.update(
          HarvestDetails,
          { id },
          { payment_is_pending: true },
        );
      }

      for (const record of payments_work) {
        const { id } = record.works_detail;
        await queryRunner.manager.update(
          WorkDetails,
          { id },
          { payment_is_pending: true },
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async removeBulk(removeBulkPaymentsDto: RemoveBulkRecordsDto<Payment>) {
    for (const { id } of removeBulkPaymentsDto.recordsIds) {
      await this.remove(id);
    }
  }

  // TODO: Generar factura en PDF
  async exportPaymentToPDF(id: string) {
    const payment = await this.findOne(id);

    const docDefinition = getPaymentReport({ data: payment });

    return this.printerService.createPdf(docDefinition);
  }
}
