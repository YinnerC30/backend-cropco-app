import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { PaymentWork } from 'src/payments/entities/payment-work.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'crops_work' })
export class Work {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({
    type: 'date',
  })
  date: string;
  @Column({
    type: 'text',
  })
  description: string;
  @Column({
    type: 'int4',
  })
  value_pay: number;
  @Column({
    type: 'bool',
    default: true,
  })
  payment_is_pending?: boolean;

  // Internal relations

  @ManyToOne(() => Employee, (employee) => employee.works, {
    eager: true,
    onDelete: 'CASCADE',
  })
  employee: Employee;

  @ManyToOne(() => Crop, (crop) => crop.works, {
    eager: true,
    onDelete: 'CASCADE',
  })
  crop: Crop;

  // External relations
  @OneToOne(() => PaymentWork, { cascade: true })
  payments_work: PaymentWork;
}
