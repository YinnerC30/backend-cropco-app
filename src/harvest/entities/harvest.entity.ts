import { Crop } from 'src/crops/entities/crop.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HarvestDetails } from './harvest-details.entity';
import { JoinColumn } from 'typeorm';

export type UnitOfMeasure = 'KILOGRAMOS' | 'LIBRAS';

@Entity()
export class Harvest {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({
    type: 'date',
  })
  date: string;

  @Column({ type: 'enum', enum: ['KILOGRAMOS', 'LIBRAS'] })
  unit_of_measure: UnitOfMeasure;

  @Column({ type: 'int4' })
  total: number;

  @Column({ type: 'int4' })
  value_pay: number;

  @Column({ type: 'varchar', length: 500 })
  observation: string;

  // Foreign Keys
  @ManyToOne(() => Crop, (crop) => crop.harvests, {
    nullable: false,
    cascade: ['remove'],
  })
  @JoinColumn({ name: 'cropId' })
  cropId: string;

  // External Relations
  @OneToMany(
    () => HarvestDetails,
    (harvest_details) => harvest_details.harvestId,
  )
  harvest_details: HarvestDetails[];
}
