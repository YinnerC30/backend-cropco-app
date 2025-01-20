import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SuppliesConsumptionDetails } from './supplies-consumption-details.entity';

@Entity({ name: 'supplies_consumption' })
export class SuppliesConsumption {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({
    type: 'date',
  })
  date: string;

  // External relations
  @OneToMany(
    () => SuppliesConsumptionDetails,
    (details) => details.consumption,
    { cascade: true },
  )
  details: SuppliesConsumptionDetails[];
  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
