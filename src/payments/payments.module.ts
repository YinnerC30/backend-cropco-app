import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarvestModule } from 'src/harvest/harvest.module';
import { WorkModule } from 'src/work/work.module';
import { PaymentsHarvest } from './entities/payment-harvest.entity';
import { PaymentsWork } from './entities/payment-work.entity';
import { Payment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentsHarvest, PaymentsWork]),
    WorkModule,
    HarvestModule,
    CommonModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [TypeOrmModule, PaymentsService],
})
export class PaymentsModule {}
