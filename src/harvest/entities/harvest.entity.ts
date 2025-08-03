import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Crop } from 'src/crops/entities/crop.entity';
import { HarvestDetails } from './harvest-details.entity';
import { HarvestProcessed } from './harvest-processed.entity';

export type UnitOfMeasure = 'KILOGRAMOS' | 'LIBRAS';

@Entity({ name: 'harvests' })
export class Harvest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'float8' })
  amount: number;

  @Column({ type: 'int4' })
  value_pay: number;

  @Column({ type: 'varchar', length: 500 })
  observation: string;

  // Relación con Crop
  @ManyToOne(() => Crop, (crop) => crop.harvests, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'cropId' })
  crop: Crop;

  // Relación con HarvestDetails
  @OneToMany(() => HarvestDetails, (details) => details.harvest, {
    cascade: true,
  })
  details: HarvestDetails[];

  // Relación con HarvestProcessed
  @OneToMany(() => HarvestProcessed, (processed) => processed.harvest, {
    cascade: true,
  })
  processed: HarvestProcessed[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
