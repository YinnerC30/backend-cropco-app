import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { Work } from 'src/work/entities/work.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PersonalInformation } from '../../common/entities/personal-information.entity';
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
    { cascade: true },
  )
  harvests_detail: HarvestDetails[];

  @OneToMany(() => Work, (work) => work.employee, { cascade: true })
  works: Work[];

  @OneToMany(() => Payment, (payment) => payment.employee, { cascade: true })
  payments: Payment[];
}
