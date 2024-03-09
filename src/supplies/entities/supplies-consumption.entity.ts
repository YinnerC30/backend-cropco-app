import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SuppliesConsumptionDetails } from '.';

@Entity()
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
    (suppliesConsumptionDetails) => suppliesConsumptionDetails.consumption,
    { eager: true, cascade: true },
  )
  details: SuppliesConsumptionDetails[];
}
