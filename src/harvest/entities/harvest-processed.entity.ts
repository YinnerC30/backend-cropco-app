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

@Entity('harvests_processed')
export class HarvestProcessed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @ManyToOne(() => Crop, (crop) => crop.harvests_processed, {onDelete: 'CASCADE'})
  crop: Crop;

  @OneToOne(() => Harvest, (harvest) => harvest.processed, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  harvest: Harvest;

  @Column({
    type: 'int4',
  })
  total: number;
}
