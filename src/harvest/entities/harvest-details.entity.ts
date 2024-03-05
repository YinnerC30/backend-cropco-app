import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Harvest } from './harvest.entity';
import { Employee } from 'src/employees/entities/employee.entity';

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
  @ManyToOne(() => Harvest, (harvest) => harvest.harvest_details, {
    nullable: false,
  })
  harvest: Harvest;

  @ManyToOne(() => Employee, (employee) => employee.harvest_details, {
    nullable: false,
  })
  employee: Employee;
}
