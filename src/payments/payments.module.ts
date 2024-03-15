import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarvestModule } from 'src/harvest/harvest.module';
import { WorkModule } from 'src/work/work.module';
import { PaymentHarvest } from './entities/payment-harvest.entity';
import { PaymentWork } from './entities/payment-work.entity';
import { Payment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentHarvest, PaymentWork]),
    WorkModule,
    HarvestModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [TypeOrmModule, PaymentsService],
})
export class PaymentsModule {}
