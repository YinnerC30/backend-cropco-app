import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { handleDBExceptions } from 'src/common/helpers/handle-db-exceptions';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { WorkDetails } from 'src/work/entities/work-details.entity';
import { DataSource, Repository } from 'typeorm';
import { PaymentDto } from './dto/payment.dto';
import { PaymentsHarvest } from './entities/payment-harvest.entity';
import { PaymentsWork } from './entities/payment-work.entity';
import { MethodOfPayment, Payment } from './entities/payment.entity';
import { QueryParamsPayment } from './dto/query-params-payment.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { PrinterService } from 'src/printer/printer.service';
import { getPaymentReport } from './reports/get-payment';
import { HandlerErrorService } from 'src/common/services/handler-error.service';
import { getComparisonOperator } from 'src/common/helpers/get-comparison-operator';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private printerService: PrinterService,
    private readonly handlerError: HandlerErrorService,
  ) {}

  async create(createPaymentDto: PaymentDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { harvests, works } = createPaymentDto.categories;

      let totalValuePayHarvests: number = 0;

      for (const id of harvests) {
        const record = await queryRunner.manager
          .getRepository(HarvestDetails)
          .findOne({ where: { id: `${id}` } });

        if (!record) {
          throw new BadRequestException(
            `The harvest detail record with id ${id} does not exist.`,
          );
        }
        totalValuePayHarvests += record.value_pay;
      }

      let totalValuePayWorks: number = 0;

      for (const id of works) {
        const record = await queryRunner.manager
          .getRepository(WorkDetails)
          .findOne({ where: { id: `${id}` } });

        if (!record) {
          throw new BadRequestException(
            `The work detail record with id ${id} does not exist.`,
          );
        }
        totalValuePayWorks += record.value_pay;
      }

      const totalVerify = totalValuePayHarvests + totalValuePayWorks;

      if (totalVerify !== createPaymentDto.value_pay) {
        throw new BadRequestException(
          `Total payment is not correct, correct value is $${totalVerify}`,
        );
      }

      const payment: Payment = queryRunner.manager.create(
        Payment,
        createPaymentDto,
      );

      payment.payments_harvest = harvests.map((id) => {
        return queryRunner.manager.create(PaymentsHarvest, {
          harvests_detail: id,
        });
      });

      payment.payments_work = works.map((id) =>
        queryRunner.manager.create(PaymentsWork, { works_detail: id }),
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
      return payment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
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

      filter_by_value_pay = false,
      type_filter_value_pay,
      value_pay,

      filter_by_method_of_payment = false,
      method_of_payment = MethodOfPayment.EFECTIVO,
    } = queryParams;

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .withDeleted()
      .leftJoinAndSelect('payment.employee', 'employee')
      .leftJoinAndSelect('payment.payments_harvest', 'payments_harvest')
      .leftJoinAndSelect('payment.payments_work', 'payments_work')
      .orderBy('payment.date', 'DESC')
      .take(limit)
      .skip(offset * limit);

    employee.length > 0 &&
      queryBuilder.andWhere('employee.id = :employeeId', {
        employeeId: employee,
      });

    filter_by_date &&
      queryBuilder.andWhere(
        `payment.date ${getComparisonOperator(type_filter_date)} :date`,
        { date },
      );

    filter_by_value_pay &&
      queryBuilder.andWhere(
        `payment.value_pay ${getComparisonOperator(type_filter_value_pay)} :value_pay`,
        {
          value_pay,
        },
      );

    filter_by_method_of_payment &&
      queryBuilder.andWhere('payment.method_of_payment = :method_of_payment', {
        method_of_payment,
      });

    const [payments, count] = await queryBuilder.getManyAndCount();

    if (payments.length === 0 && count > 0) {
      throw new NotFoundException(
        'There are no payment records with the requested pagination',
      );
    }

    return {
      total_row_count: count,
      current_row_count: payments.length,
      total_page_count: Math.ceil(count / limit),
      current_page_count: payments.length > 0 ? offset + 1 : 0,
      records: payments,
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

      payments_harvest.forEach(async (record) => {
        const { id } = record.harvests_detail;
        await queryRunner.manager.update(
          HarvestDetails,
          { id },
          { payment_is_pending: true },
        );
      });

      payments_work.forEach(async (record) => {
        const { id } = record.works_detail;
        await queryRunner.manager.update(
          WorkDetails,
          { id },
          { payment_is_pending: true },
        );
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handlerError.handle(error, this.logger);
    } finally {
      await queryRunner.release();
    }
  }

  async removeBulk(removeBulkPaymentsDto: RemoveBulkRecordsDto<Payment>) {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const { id } of removeBulkPaymentsDto.recordsIds) {
      try {
        await this.remove(id);
        success.push(id);
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }

    return { success, failed };
  }

  async exportPaymentToPDF(id: string) {
    const payment = await this.findOne(id);
    const docDefinition = getPaymentReport({ data: payment });
    return this.printerService.createPdf({ docDefinition });
  }
}
