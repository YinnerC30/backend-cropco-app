import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SuppliesConsumption } from './supplies-consumption.entity';
import { Crop } from 'src/crops/entities/crop.entity';
import { Supply } from './supply.entity';

@Entity()
export class SuppliesConsumptionDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Internal relations
  @ManyToOne(
    () => SuppliesConsumption,
    (suppliesConsumption) => suppliesConsumption.details,
  )
  suppliesConsumption: SuppliesConsumption;

  @ManyToOne(() => Supply, (supply) => supply.suppliesConsumption)
  supply: Supply;

  @ManyToOne(() => Crop, (crop) => crop.suppliesConsumptionDetails)
  crop: Crop;

  @Column({
    type: 'int4',
  })
  amount: number;
}
