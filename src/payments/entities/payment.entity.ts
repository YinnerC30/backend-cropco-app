import { Employee } from 'src/employees/entities/employee.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentHarvest } from './payment-harvest.entity';
import { PaymentWork } from './payment-work.entity';

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'date' })
  date: string;
  @ManyToOne(() => Employee, (employee) => employee.payments, {
    onDelete: 'CASCADE',
    eager: true,
  })
  employee: Employee;
  @Column({ type: 'varchar' })
  method_of_payment: string;
  @Column({ type: 'int4' })
  total: number;

  // External relations
  @OneToMany(
    () => PaymentHarvest,
    (payments_harvest) => payments_harvest.payment,
    {
      cascade: true,
      eager: true,
    },
  )
  payments_harvest: PaymentHarvest[];

  @OneToMany(() => PaymentWork, (payments_work) => payments_work.payment, {
    cascade: true,
    eager: true,
  })
  payments_work: PaymentWork[];
}
