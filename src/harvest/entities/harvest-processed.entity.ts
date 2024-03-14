import { Crop } from 'src/crops/entities/crop.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Harvest } from './harvest.entity';

@Entity('harvest_processed')
export class HarvestProcessed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @ManyToOne(() => Crop, (crop) => crop.harvestsProcessed, { eager: true })
  crop: Crop;

  @OneToOne(() => Harvest, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn()
  harvest: Harvest;

  @Column({
    type: 'int4',
  })
  total: number;
}
