import { Crop } from 'src/crops/entities/crop.entity';
import { Supply } from 'src/supplies/entities';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SuppliesConsumption } from './supplies-consumption.entity';


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
  consumption: SuppliesConsumption;

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
