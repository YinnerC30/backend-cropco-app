import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { Work } from 'src/work/entities/work.entity';

@Entity({ name: 'payment_work' })
export class PaymentWork {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Payment, (payment) => payment.payment_works, {
    onDelete: 'CASCADE',
  })
  payment: Payment;

  @OneToOne(() => Work, { onDelete: 'CASCADE', eager: true })
  @JoinColumn()
  work: Work;
}
