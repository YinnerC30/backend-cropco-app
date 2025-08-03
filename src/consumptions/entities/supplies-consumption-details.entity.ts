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
import { AllUnitTypesDto } from 'src/common/utils/UnitTypesDto';

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
    onDelete: 'RESTRICT',
  })
  supply: Supply;

  @ManyToOne(() => Crop, (crop) => crop.supplies_consumption_details, {
    onDelete: 'RESTRICT',
  })
  crop: Crop;

  @Column({
    type: 'enum',
    enum: AllUnitTypesDto,
  })
  unit_of_measure: UnitType;

  @Column({
    type: 'float8',
  })
  amount: number;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
