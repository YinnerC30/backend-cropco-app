import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
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
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'consumptionId' })
  consumption: SuppliesConsumption;

  @ManyToOne(() => Supply, (supply) => supply.suppliesConsumption, {
    eager: true,
    onDelete: 'CASCADE',
  })
  supply: Supply;

  @ManyToOne(() => Crop, (crop) => crop.suppliesConsumptionDetails, {
    eager: true,
    onDelete: 'CASCADE',
  })
  crop: Crop;

  @Column({
    type: 'int4',
  })
  amount: number;
}
