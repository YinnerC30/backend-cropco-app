import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Payment } from './payment.entity';
import { WorkDetails } from 'src/work/entities/work-details.entity';

@Entity({ name: 'payments_work' })
export class PaymentsWork {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Payment, (payment) => payment.payments_work, {
    onDelete: 'CASCADE',
  })
  payment: Payment;

  @OneToOne(() => WorkDetails, (works_detail) => works_detail.payments_work, {
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn()
  works_detail: WorkDetails;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
