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
export class PaymentsHarvest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Payment, (payment) => payment.payments_harvest, {
    onDelete: 'CASCADE',
  })
  payment: Payment;

  @OneToOne(
    () => HarvestDetails,
    (harvests_detail) => harvests_detail.payments_harvest,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn()
  harvests_detail: HarvestDetails;
}
