import { Employee } from 'src/employees/entities/employee.entity';
import { Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Work } from './work.entity';
import { PaymentWork } from 'src/payments/entities/payment-work.entity';

@Entity({ name: 'works_detail' })
export class WorkDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, (employee) => employee.works_detail, {
    onDelete: 'CASCADE',
  })
  employee: Employee;

  @Column({
    type: 'int4',
  })
  value_pay: number;

  @Column({
    type: 'bool',
    default: true,
  })
  payment_is_pending: boolean;

  //   Internal relations
  @ManyToOne(() => Work, (work) => work.details, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  work: Work;

  // External relations
  @OneToOne(() => PaymentWork, (payments_work) => payments_work.works_detail, {
    cascade: true,
  })
  payments_work: PaymentWork;
}
