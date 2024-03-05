import { PersonalInformation } from '../../common/entities/personal-information.entity';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
@Entity()
export class Employee extends PersonalInformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  address: string;

  // External relations
  @OneToMany(
    () => HarvestDetails,
    (harvest_details) => harvest_details.employeeId,
  )
  harvest_details: HarvestDetails[];
}
