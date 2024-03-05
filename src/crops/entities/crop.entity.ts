import { HarvestStock } from 'src/harvest/entities/harvest-stock.entity';
import { Harvest } from 'src/harvest/entities/harvest.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Crop {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;
  @Column({ type: 'varchar', length: 500 })
  description: string;
  @Column({ type: 'int4' })
  units: number;
  @Column({ type: 'varchar', length: 500 })
  location: string;
  @Column({ type: 'date' })
  date_of_creation: string;
  @Column({ type: 'date' })
  date_of_termination: string;

  // External relations

  @OneToMany(() => Harvest, (harvest) => harvest.cropId)
  harvests: Harvest[];

  // @OneToOne(() => HarvestStock)
  // @JoinColumn({ name: 'harvestStockId' })
  // harvest_stock: HarvestStock;
}
