import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentHarvest } from './entities/payment-harvest.entity';
import { PaymentWork } from './entities/payment-work.entity';
import { WorkModule } from 'src/work/work.module';
import { HarvestModule } from 'src/harvest/harvest.module';

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
