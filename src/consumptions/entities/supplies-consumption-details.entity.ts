import { Crop } from 'src/crops/entities/crop.entity';
import { Supply } from 'src/supplies/entities';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SuppliesConsumption } from './supplies-consumption.entity';
import { UnitType } from 'src/common/unit-conversion/unit-conversion.service';

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
    type: 'enum',
    enum: [
      // Unidades de masa
      'GRAMOS',
      'KILOGRAMOS',
      'LIBRAS',
      'ONZAS',
      'TONELADAS',
      // Unidades de volumen
      'MILILITROS',
      'LITROS',
      'GALONES',
      // Longitud
      'MILIMETROS',
      'CENTIMETROS',
      'METROS',
    ],
  })
  unit_of_measure: UnitType;

  @Column({
    type: 'int4',
  })
  amount: number;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
