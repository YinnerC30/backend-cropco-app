import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PersonalInformation } from '../../common/entities/personal-information.entity';
import { WorkDetails } from 'src/work/entities/work-details.entity';
@Entity({ name: 'employees' })
export class Employee extends PersonalInformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  address: string;

  // External relations

  @OneToMany(
    () => HarvestDetails,
    (harvest_details) => harvest_details.employee,
    { cascade: false },
  )
  harvests_detail: HarvestDetails[];

  @OneToMany(() => WorkDetails, (workDetails) => workDetails.employee, {
    cascade: true,
  })
  works_detail: WorkDetails[];

  @OneToMany(() => Payment, (payment) => payment.employee, { cascade: true })
  payments: Payment[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
