import { Work } from 'src/work/entities/work.entity';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

@Entity({ name: 'payments_work' })
export class PaymentWork {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Payment, (payment) => payment.payments_work, {
    onDelete: 'CASCADE',
  })
  payment: Payment;

  @OneToOne(() => Work, (work) => work.payments_work, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  work: Work;
}
