import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SuppliesConsumptionDetails } from '.';

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
}
