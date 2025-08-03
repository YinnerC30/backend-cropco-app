import { Employee } from 'src/employees/entities/employee.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentsHarvest } from './payment-harvest.entity';
import { PaymentsWork } from './payment-work.entity';

export enum MethodOfPayment {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  INTERCAMBIO = 'INTERCAMBIO',
}

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @ManyToOne(() => Employee, (employee) => employee.payments, {
    onDelete: 'RESTRICT',
  })
  employee: Employee;

  @Column({ type: 'enum', enum: MethodOfPayment })
  method_of_payment: MethodOfPayment;

  @Column({ type: 'int4' })
  value_pay: number;

  @OneToMany(
    () => PaymentsHarvest,
    (payments_harvest) => payments_harvest.payment,
    {
      cascade: true,
    },
  )
  payments_harvest: PaymentsHarvest[];

  @OneToMany(() => PaymentsWork, (payments_work) => payments_work.payment, {
    cascade: true,
  })
  payments_work: PaymentsWork[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
