import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { PaymentWork } from 'src/payments/entities/payment-work.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkDetails } from './work-details.entity';

@Entity({ name: 'works' })
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
  total: number;

  // Internal relations

  @ManyToOne(() => Crop, (crop) => crop.works, {
    onDelete: 'CASCADE',
  })
  crop: Crop;

  // External relations

  @OneToMany(() => WorkDetails, (workDetails) => workDetails.work, {
    cascade: true,
  })
  details: WorkDetails[];

  @OneToOne(() => PaymentWork, (payments_work) => payments_work.work, {
    cascade: true,
  })
  payments_work: PaymentWork;
}
