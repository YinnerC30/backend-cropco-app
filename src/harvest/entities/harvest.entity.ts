import { Crop } from 'src/crops/entities/crop.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HarvestDetails } from './harvest-details.entity';
import { HarvestProcessed } from './harvest-processed.entity';

export type UnitOfMeasure = 'KILOGRAMOS' | 'LIBRAS';

@Entity({ name: 'harvests' })
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
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cropId' })
  crop: Crop;

  // External Relations
  @OneToMany(() => HarvestDetails, (details) => details.harvest, {
    cascade: true,
  })
  details: HarvestDetails[];

  @OneToOne(() => HarvestProcessed, (processed) => processed.harvest, {
    cascade: true,
  })
  processed: HarvestProcessed;
}
