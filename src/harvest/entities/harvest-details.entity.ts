import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Harvest } from './harvest.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { PaymentHarvest } from 'src/payments/entities/payment-harvest.entity';

@Entity()
export class HarvestDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int4',
  })
  total: number;
  @Column({
    type: 'int4',
  })
  value_pay: number;
  @Column({
    type: 'bool',
    default: true,
  })
  payment_is_pending: boolean;

  // Foreign Keys
  @ManyToOne(() => Harvest, (harvest) => harvest.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'harvestId' })
  harvest: Harvest;

  @ManyToOne(() => Employee, (employee) => employee.harvest_details, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @OneToOne(() => PaymentHarvest, { cascade: true })
  paymentHarvest: PaymentHarvest;
}
