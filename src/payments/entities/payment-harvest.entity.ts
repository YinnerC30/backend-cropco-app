import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

@Entity({ name: 'payments_harvest' })
export class PaymentHarvest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Payment, (payment) => payment.payments_harvest, {
    onDelete: 'CASCADE',
  })
  payment: Payment;

  @OneToOne(() => HarvestDetails, { onDelete: 'CASCADE', eager: true })
  @JoinColumn()
  harvests_detail: HarvestDetails;
}
