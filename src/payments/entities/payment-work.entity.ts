import { Work } from 'src/work/entities/work.entity';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';
import { WorkDetails } from 'src/work/entities/work-details.entity';

@Entity({ name: 'payments_work' })
export class PaymentWork {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Payment, (payment) => payment.payments_work, {
    onDelete: 'CASCADE',
  })
  payment: Payment;

  @OneToOne(() => WorkDetails, (works_detail) => works_detail.payments_work, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  works_detail: WorkDetails;
}
