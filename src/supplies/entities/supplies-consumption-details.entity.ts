import { Crop } from 'src/crops/entities/crop.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SuppliesConsumption } from './supplies-consumption.entity';
import { Supply } from './supply.entity';

@Entity({ name: 'supplies_consumption_details' })
export class SuppliesConsumptionDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Internal relations
  @ManyToOne(
    () => SuppliesConsumption,
    (supplies_consumption) => supplies_consumption.details,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'consumptionId' })
  supplies_consumption: SuppliesConsumption;

  @ManyToOne(() => Supply, (supply) => supply.consumption_details, {
    onDelete: 'CASCADE',
  })
  supply: Supply;

  @ManyToOne(() => Crop, (crop) => crop.supplies_consumption_details, {
    onDelete: 'CASCADE',
  })
  crop: Crop;

  @Column({
    type: 'int4',
  })
  amount: number;
}
