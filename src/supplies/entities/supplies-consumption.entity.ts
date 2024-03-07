import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SuppliesConsumptionDetails } from './supplies-consumption-details.entity';

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
    (suppliesConsumptionDetails) =>
      suppliesConsumptionDetails.suppliesConsumption,
  )
  details: SuppliesConsumptionDetails;
}
