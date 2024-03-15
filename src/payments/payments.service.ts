import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { handleDBExceptions } from 'src/common/helpers/handleDBErrors';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { DataSource, Repository } from 'typeorm';
import { PaginationDto } from '../common/dto/pagination.dto';
import { HarvestService } from 'src/harvest/harvest.service';
import { WorkService } from 'src/work/work.service';
import { PaymentHarvest } from './entities/payment-harvest.entity';
import { PaymentWork } from './entities/payment-work.entity';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { Work } from 'src/work/entities/work.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');
  private handleDBExceptions = (error: any, logger = this.logger) =>
    handleDBExceptions(error, logger);
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly harvestService: HarvestService,
    private readonly workService: WorkService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto) {
    // Crear e iniciar la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const { harvests, works } = createPaymentDto.categories;

    const totalValuePayHarvest = [];

    for (const id of harvests) {
      const record = await queryRunner.manager
        .getRepository(HarvestDetails)
        .findOne({ where: { id: `${id}` } });
      totalValuePayHarvest.push(record.value_pay);
    }

    const totalValuePayWork = [];
    for (const id of works) {
      const record = await queryRunner.manager
        .getRepository(Work)
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
        queryRunner.manager.create(PaymentWork, { work: id }),
      );

      // Cambiar estado de pago

      for (const id of harvests) {
        await queryRunner.manager.update(
          HarvestDetails,
          { id },
          { payment_is_pending: false },
        );
      }

      for (const id of works) {
        await queryRunner.manager.update(
          Work,
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

  findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    return this.paymentRepository.find({
      order: {
        date: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    const payment = await this.paymentRepository.findOne({
      where: {
        id,
      },
    });
    if (!payment)
      throw new NotFoundException(`Payment with id: ${id} not found`);
    return payment;
  }

  async remove(id: string) {
    const payment = await this.findOne(id);
    // Crear e iniciar la transacción
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
        const { id } = record.work;
        await queryRunner.manager.update(
          Work,
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
}
