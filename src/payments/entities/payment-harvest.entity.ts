import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';

@Entity({ name: 'payment_harvest' })
export class PaymentHarvest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Payment, (payment) => payment.payment_harvests, {
    onDelete: 'CASCADE',
  })
  payment: Payment;

  @OneToOne(() => HarvestDetails, { onDelete: 'CASCADE', eager: true })
  @JoinColumn()
  harvest_detail: HarvestDetails;
}
